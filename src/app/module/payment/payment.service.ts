/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import Stripe from "stripe";
import { Payment } from "../../../generated/prisma/client";
import {
  PaymentMethod,
  PaymentStatus,
  ParticipantStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { envVars } from "../../config/env";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";
import { sendEmail } from "../../utils/email";

const createCheckoutSession = async (
  userId: string,
  eventId: string,
): Promise<{ sessionId: string; url: string }> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  if (Number(event.fee) === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "This is a free event. No payment required.",
    );
  }

  if (event.organizerId === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot pay for your own event",
    );
  }

  // Check if already has a successful payment
  const existingPayment = await prisma.payment.findFirst({
    where: {
      eventId,
      userId,
      status: PaymentStatus.SUCCESS,
    },
  });

  if (existingPayment) {
    throw new AppError(
      status.CONFLICT,
      "You have already paid for this event",
    );
  }

  // Check if banned
  const existingParticipant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (existingParticipant?.status === ParticipantStatus.BANNED) {
    throw new AppError(
      status.FORBIDDEN,
      "You have been banned from this event",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Create pending payment record first
  const payment = await prisma.payment.create({
    data: {
      amount: Number(event.fee),
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.PENDING,
      userId,
      eventId,
    },
  });

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user!.email,
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: event.title,
            description: event.description.substring(0, 200),
          },
          unit_amount: Math.round(Number(event.fee) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      eventId,
      userId,
      paymentId: payment.id,
    },
    success_url: `${envVars.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/payment/cancel?event_id=${eventId}`,
  });

  // Update payment with Stripe session ID
  await prisma.payment.update({
    where: { id: payment.id },
    data: { transactionId: session.id },
  });

  return {
    sessionId: session.id,
    url: session.url as string,
  };
};

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
  // Idempotency check
  const existingPayment = await prisma.payment.findFirst({
    where: {
      stripeEventId: event.id,
    },
  });

  if (existingPayment) {
    console.log(`Event ${event.id} already processed. Skipping`);
    return { message: `Event ${event.id} already processed. Skipping` };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;

      const eventId = session.metadata?.eventId;
      const userId = session.metadata?.userId;
      const paymentId = session.metadata?.paymentId;

      if (!eventId || !userId || !paymentId) {
        console.error("⚠️ Missing metadata in webhook event");
        return { message: "Missing metadata" };
      }

      // Verify event exists
      const eventData = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!eventData) {
        console.error(
          `⚠️ Event ${eventId} not found. Payment may be for deleted event.`,
        );
        return { message: "Event not found" };
      }

      // Update payment and create participant in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status:
              session.payment_status === "paid"
                ? PaymentStatus.SUCCESS
                : PaymentStatus.PENDING,
            gatewayData: session,
            stripeEventId: event.id,
          },
        });

        // Create or update participant if payment is successful
        if (session.payment_status === "paid") {
          const existingParticipant = await tx.participant.findUnique({
            where: {
              eventId_userId: { eventId, userId },
            },
          });

          if (existingParticipant) {
            await tx.participant.update({
              where: {
                eventId_userId: { eventId, userId },
              },
              data: { status: ParticipantStatus.APPROVED },
            });
          } else {
            await tx.participant.create({
              data: {
                eventId,
                userId,
                status: ParticipantStatus.APPROVED,
              },
            });
          }
        }
      });

      // Send payment receipt email (non-blocking)
      if (session.payment_status === "paid") {
        try {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            await sendEmail({
              to: user.email,
              subject: `Payment Confirmed — ${eventData.title}`,
              templateName: "invoice",
              templateData: {
                userName: user.name,
                paymentId: paymentId,
                transactionId: session.id || "",
                paymentDate: new Date().toLocaleDateString(),
                eventTitle: eventData.title,
                eventDate: new Date(eventData.date).toLocaleDateString(),
                eventVenue: eventData.venue || null,
                amount: Number(eventData.fee).toFixed(2),
              },
            });
          }
        } catch (emailError) {
          console.error("Failed to send payment receipt email:", emailError);
        }
      }

      console.log(
        `✅ Payment ${session.payment_status} for event ${eventId}`,
      );
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as any;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.CANCELLED,
            gatewayData: session,
            stripeEventId: event.id,
          },
        });
      }

      console.log(
        `Checkout session ${session.id} expired. Payment marked as cancelled.`,
      );
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;

      console.log(
        `Payment intent ${paymentIntent.id} failed. Marking associated payment as failed.`,
      );
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return { message: `Webhook Event ${event.id} processed successfully` };
};

const getPaymentsByEvent = async (
  eventId: string,
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Payment>> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  if (event.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the event organizer can view payments",
    );
  }

  const { page = "1", limit = "10", sortBy = "createdAt", sortOrder = "desc" } = query;
  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where = { eventId };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const getMyPayments = async (
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Payment>> => {
  const { page = "1", limit = "10", sortBy = "createdAt", sortOrder = "desc" } = query;
  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where = { userId };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            venue: true,
            fee: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const verifyPayment = async (
  sessionId: string,
  userId: string,
) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: sessionId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          venue: true,
          eventLink: true,
          type: true,
          fee: true,
          image: true,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(status.NOT_FOUND, "Payment not found");
  }

  if (payment.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not authorized to view this payment",
    );
  }

  // Get participant status
  const participant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId: payment.eventId, userId },
    },
    select: {
      status: true,
      joinedAt: true,
    },
  });

  return {
    // Payment info
    paymentId: payment.id,
    transactionId: payment.transactionId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    paidAt: payment.createdAt,

    // Ticket/Participant info
    ticket: {
      participantStatus: participant?.status || null,
      joinedAt: participant?.joinedAt || null,
    },

    // Event info
    event: payment.event,

    // User info
    user: payment.user,
  };
};

const getPaymentReceipt = async (paymentId: string, userId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          venue: true,
          eventLink: true,
          type: true,
          fee: true,
          image: true,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(status.NOT_FOUND, "Payment not found");
  }

  if (payment.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not authorized to view this payment",
    );
  }

  const participant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId: payment.eventId, userId },
    },
    select: {
      status: true,
      joinedAt: true,
    },
  });

  return {
    paymentId: payment.id,
    transactionId: payment.transactionId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    paidAt: payment.createdAt,
    ticket: {
      participantStatus: participant?.status || null,
      joinedAt: participant?.joinedAt || null,
    },
    event: payment.event,
    user: payment.user,
  };
};

export const paymentService = {
  createCheckoutSession,
  handleStripeWebhookEvent,
  getPaymentsByEvent,
  getMyPayments,
  verifyPayment,
  getPaymentReceipt,
};
