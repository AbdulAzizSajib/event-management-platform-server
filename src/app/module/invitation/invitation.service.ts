import status from "http-status";
import { Invitation, Prisma } from "../../../generated/prisma/client";
import {
  InvitationStatus,
  ParticipantStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";
import { sendEmail } from "../../utils/email";
import { envVars } from "../../config/env";

const sendInvitation = async (
  inviterId: string,
  eventId: string,
  inviteeId: string,
): Promise<Invitation> => {
  // Cannot invite yourself
  if (inviterId === inviteeId) {
    throw new AppError(status.BAD_REQUEST, "You cannot invite yourself");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  // Only event organizer can send invitations
  if (event.organizerId !== inviterId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the event organizer can send invitations",
    );
  }

  // Check if invitee exists
  const invitee = await prisma.user.findUnique({
    where: { id: inviteeId },
  });

  if (!invitee) {
    throw new AppError(status.NOT_FOUND, "Invitee user not found");
  }

  // Check if already invited
  const existingInvitation = await prisma.invitation.findUnique({
    where: {
      eventId_inviteeId: { eventId, inviteeId },
    },
  });

  if (existingInvitation) {
    throw new AppError(
      status.CONFLICT,
      "This user has already been invited to this event",
    );
  }

  // Check if already a participant
  const existingParticipant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId, userId: inviteeId },
    },
  });

  if (existingParticipant) {
    throw new AppError(
      status.CONFLICT,
      "This user is already a participant of this event",
    );
  }

  const invitation = await prisma.invitation.create({
    data: {
      eventId,
      inviterId,
      inviteeId,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          fee: true,
          date: true,
          time: true,
          venue: true,
        },
      },
      invitee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  // Send invitation email to invitee (non-blocking)
  try {
    await sendEmail({
      to: invitee.email,
      subject: `You're invited to "${invitation.event.title}"`,
      templateName: "invitation",
      templateData: {
        inviteeName: invitee.name,
        inviterName: invitation.inviter.name,
        eventTitle: invitation.event.title,
        eventDate: new Date(invitation.event.date).toLocaleDateString(),
        eventTime: invitation.event.time,
        eventVenue: invitation.event.venue || null,
        eventFee: invitation.event.fee,
        dashboardUrl: `${envVars.FRONTEND_URL}/dashboard/invitations`,
      },
    });
  } catch (error) {
    console.error(`Failed to send invitation email to ${invitee.email}:`, error);
  }

  return invitation;
};

const respondToInvitation = async (
  invitationId: string,
  userId: string,
  responseStatus: "ACCEPTED" | "DECLINED",
): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      event: true,
    },
  });

  if (!invitation) {
    throw new AppError(status.NOT_FOUND, "Invitation not found");
  }

  // Only invitee can respond
  if (invitation.inviteeId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the invited user can respond to this invitation",
    );
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      `Invitation has already been ${invitation.status.toLowerCase()}`,
    );
  }

  // If accepting, create participant record
  if (responseStatus === "ACCEPTED") {
    const isFreeEvent = Number(invitation.event.fee) === 0;

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED },
      });

      // For free events, auto-approve participant
      // For paid events, participant stays PENDING until payment
      const existingParticipant = await tx.participant.findUnique({
        where: {
          eventId_userId: {
            eventId: invitation.eventId,
            userId,
          },
        },
      });

      if (!existingParticipant) {
        await tx.participant.create({
          data: {
            eventId: invitation.eventId,
            userId,
            status: isFreeEvent
              ? ParticipantStatus.APPROVED
              : ParticipantStatus.PENDING,
          },
        });
      }
    });
  } else {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.DECLINED },
    });
  }

  // Return updated invitation
  const updatedInvitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          fee: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return updatedInvitation as Invitation;
};

const getMyInvitations = async (
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Invitation>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
    status: invitationStatus,
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.InvitationWhereInput = { inviteeId: userId };

  if (invitationStatus) {
    where.status = invitationStatus as InvitationStatus;
  }

  const [data, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            fee: true,
            date: true,
            time: true,
            venue: true,
          },
        },
        inviter: {
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
    prisma.invitation.count({ where }),
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

const getSentInvitations = async (
  userId: string,
  eventId: string,
  query: IQueryParams,
): Promise<IQueryResult<Invitation>> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  if (event.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the event organizer can view sent invitations",
    );
  }

  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
    status: invitationStatus,
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.InvitationWhereInput = {
    eventId,
    inviterId: userId,
  };

  if (invitationStatus) {
    where.status = invitationStatus as InvitationStatus;
  }

  const [data, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      include: {
        invitee: {
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
    prisma.invitation.count({ where }),
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

const cancelInvitation = async (
  invitationId: string,
  userId: string,
): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      event: true,
    },
  });

  if (!invitation) {
    throw new AppError(status.NOT_FOUND, "Invitation not found");
  }

  // Only organizer (inviter) can cancel
  if (invitation.inviterId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the event organizer can cancel invitations",
    );
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot cancel an invitation that has been ${invitation.status.toLowerCase()}`,
    );
  }

  const deletedInvitation = await prisma.invitation.delete({
    where: { id: invitationId },
  });

  return deletedInvitation;
};

export const invitationService = {
  sendInvitation,
  respondToInvitation,
  getMyInvitations,
  getSentInvitations,
  cancelInvitation,
};
