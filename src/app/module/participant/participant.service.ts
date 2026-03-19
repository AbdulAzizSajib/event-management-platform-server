import status from "http-status";
import { Participant, Prisma } from "../../../generated/prisma/client";
import { ParticipantStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";

const joinEvent = async (
  userId: string,
  eventId: string,
): Promise<Participant> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  // Cannot join own event
  if (event.organizerId === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot join your own event",
    );
  }

  // Check if already a participant
  const existingParticipant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (existingParticipant) {
    if (existingParticipant.status === ParticipantStatus.BANNED) {
      throw new AppError(
        status.FORBIDDEN,
        "You have been banned from this event",
      );
    }
    throw new AppError(
      status.CONFLICT,
      "You have already joined this event",
    );
  }

  // For paid events, participant stays PENDING until payment is confirmed
  // For free PUBLIC events, auto-approve
  // For PRIVATE events, stays PENDING until host approves
  const autoApprove =
    event.type === "PUBLIC" && Number(event.fee) === 0;

  const participant = await prisma.participant.create({
    data: {
      eventId,
      userId,
      status: autoApprove
        ? ParticipantStatus.APPROVED
        : ParticipantStatus.PENDING,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          fee: true,
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

  return participant;
};

const getEventParticipants = async (
  eventId: string,
  query: IQueryParams,
): Promise<IQueryResult<Participant>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "joinedAt",
    sortOrder = "desc",
    status: participantStatus,
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  const where: Prisma.ParticipantWhereInput = { eventId };

  if (participantStatus) {
    where.status = participantStatus as ParticipantStatus;
  }

  const [data, total] = await Promise.all([
    prisma.participant.findMany({
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
    prisma.participant.count({ where }),
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

const getMyParticipations = async (
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Participant>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "joinedAt",
    sortOrder = "desc",
    status: participantStatus,
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ParticipantWhereInput = { userId };

  if (participantStatus) {
    where.status = participantStatus as ParticipantStatus;
  }

  const [data, total] = await Promise.all([
    prisma.participant.findMany({
      where,
      include: {
        event: {
          include: {
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
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.participant.count({ where }),
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

const updateParticipantStatus = async (
  participantId: string,
  userId: string,
  newStatus: ParticipantStatus,
): Promise<Participant> => {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: {
      event: true,
    },
  });

  if (!participant) {
    throw new AppError(status.NOT_FOUND, "Participant not found");
  }

  // Only event organizer can approve/reject/ban
  if (participant.event.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the event organizer can update participant status",
    );
  }

  // Cannot change status of already banned participant (must unban first)
  if (
    participant.status === ParticipantStatus.BANNED &&
    newStatus !== ParticipantStatus.APPROVED
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      "Banned participant can only be unbanned (set to APPROVED)",
    );
  }

  const updatedParticipant = await prisma.participant.update({
    where: { id: participantId },
    data: { status: newStatus },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return updatedParticipant;
};

const cancelParticipation = async (
  eventId: string,
  userId: string,
): Promise<Participant> => {
  const participant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (!participant) {
    throw new AppError(status.NOT_FOUND, "Participation not found");
  }

  if (participant.status === ParticipantStatus.BANNED) {
    throw new AppError(
      status.FORBIDDEN,
      "You have been banned from this event and cannot cancel",
    );
  }

  const deletedParticipant = await prisma.participant.delete({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  return deletedParticipant;
};

export const participantService = {
  joinEvent,
  getEventParticipants,
  getMyParticipations,
  updateParticipantStatus,
  cancelParticipation,
};
