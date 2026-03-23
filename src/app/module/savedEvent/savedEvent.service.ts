import status from "http-status";
import { Prisma, SavedEvent } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";

const saveEvent = async (
  userId: string,
  eventId: string,
): Promise<SavedEvent> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  const existing = await prisma.savedEvent.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, "Event already saved");
  }

  const savedEvent = await prisma.savedEvent.create({
    data: { userId, eventId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          venue: true,
          fee: true,
          type: true,
        },
      },
    },
  });

  return savedEvent;
};

const unsaveEvent = async (
  userId: string,
  eventId: string,
): Promise<SavedEvent> => {
  const savedEvent = await prisma.savedEvent.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });

  if (!savedEvent) {
    throw new AppError(status.NOT_FOUND, "Saved event not found");
  }

  const deleted = await prisma.savedEvent.delete({
    where: {
      userId_eventId: { userId, eventId },
    },
  });

  return deleted;
};

const getMySavedEvents = async (
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<SavedEvent>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "savedAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.SavedEventWhereInput = { userId };

  const [data, total] = await Promise.all([
    prisma.savedEvent.findMany({
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
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.savedEvent.count({ where }),
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

const isEventSaved = async (
  userId: string,
  eventId: string,
): Promise<boolean> => {
  const savedEvent = await prisma.savedEvent.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });

  return !!savedEvent;
};

export const savedEventService = {
  saveEvent,
  unsaveEvent,
  getMySavedEvents,
  isEventSaved,
};
