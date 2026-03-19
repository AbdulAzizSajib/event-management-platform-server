import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { paymentService } from "./payment.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";
import { stripe } from "../../lib/stripe";
import { envVars } from "../../config/env";

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.createCheckoutSession(
      req.user.userId,
      req.body.eventId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  },
);

const handleStripeWebhookEvent = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      envVars.STRIPE_WEBHOOK_SECRET,
    );

    const result = await paymentService.handleStripeWebhookEvent(event);
    res.status(200).json(result);
  } catch {
    res.status(400).json({ error: "Webhook processing failed" });
  }
};

const getPaymentsByEvent = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.getPaymentsByEvent(
      req.params.eventId as string,
      req.user.userId,
      req.query as IQueryParams,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Payments retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getMyPayments(
    req.user.userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.verifyPayment(
    req.params.sessionId as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment verified successfully",
    data: result,
  });
});

export const paymentController = {
  createCheckoutSession,
  handleStripeWebhookEvent,
  getPaymentsByEvent,
  getMyPayments,
  verifyPayment,
};
