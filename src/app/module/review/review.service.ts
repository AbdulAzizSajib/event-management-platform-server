import status from "http-status";
import { Review, Prisma } from "../../../generated/prisma/client";
import { ParticipantStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";

const createReview = async (
  userId: string,
  payload: { eventId: string; rating: number; comment: string },
): Promise<Review> => {
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  // Cannot review own event
  if (event.organizerId === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot review your own event",
    );
  }

  // Only APPROVED participants can review
  const participant = await prisma.participant.findUnique({
    where: {
      eventId_userId: { eventId: payload.eventId, userId },
    },
  });

  if (!participant || participant.status !== ParticipantStatus.APPROVED) {
    throw new AppError(
      status.FORBIDDEN,
      "Only approved participants can review an event",
    );
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: {
      eventId_userId: { eventId: payload.eventId, userId },
    },
  });

  if (existingReview) {
    throw new AppError(
      status.CONFLICT,
      "You have already reviewed this event",
    );
  }

  const review = await prisma.review.create({
    data: {
      eventId: payload.eventId,
      userId,
      rating: payload.rating,
      comment: payload.comment,
    },
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

  return review;
};

const updateReview = async (
  reviewId: string,
  userId: string,
  payload: { rating?: number; comment?: string },
): Promise<Review> => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  if (review.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only edit your own review",
    );
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: payload,
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

  return updatedReview;
};

const deleteReview = async (
  reviewId: string,
  userId: string,
  userRole: string,
): Promise<Review> => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  // Owner or Admin/Super Admin can delete
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  if (review.userId !== userId && !isAdmin) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own review",
    );
  }

  const deletedReview = await prisma.review.delete({
    where: { id: reviewId },
  });

  return deletedReview;
};

const getEventReviews = async (
  eventId: string,
  query: IQueryParams,
): Promise<IQueryResult<Review>> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ReviewWhereInput = { eventId };

  const [data, total] = await Promise.all([
    prisma.review.findMany({
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
    prisma.review.count({ where }),
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

const getMyReviews = async (
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Review>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ReviewWhereInput = { userId };

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            venue: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.review.count({ where }),
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

export const reviewService = {
  createReview,
  updateReview,
  deleteReview,
  getEventReviews,
  getMyReviews,
};
