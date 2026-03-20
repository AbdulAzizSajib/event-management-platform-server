import status from "http-status";
import { User, Event, Review, Prisma } from "../../../generated/prisma/client";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";

// ========== USER MANAGEMENT ==========

const getAllUsers = async (
  query: IQueryParams,
): Promise<IQueryResult<User>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
    searchTerm,
    status: userStatus,
    role,
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.UserWhereInput = {};

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (userStatus) {
    where.status = userStatus as UserStatus;
  }

  if (role) {
    where.role = role as Prisma.EnumRoleFilter;
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        phone: true,
        status: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        needPasswordChange: true,
        _count: {
          select: {
            organizedEvents: true,
            participants: true,
            reviews: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: data as unknown as User[],
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const updateUserStatus = async (
  userId: string,
  newStatus: UserStatus,
): Promise<User> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.role === "SUPER_ADMIN") {
    throw new AppError(
      status.FORBIDDEN,
      "Cannot change status of a Super Admin",
    );
  }

  const updateData: Prisma.UserUpdateInput = {
    status: newStatus,
  };

  if (newStatus === UserStatus.DELETED) {
    updateData.isDeleted = true;
    updateData.deletedAt = new Date();
  }

  if (newStatus === UserStatus.ACTIVE) {
    updateData.isDeleted = false;
    updateData.deletedAt = null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return updatedUser;
};

const getUserById = async (userId: string): Promise<User> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      admin: true,
      organizedEvents: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
      participants: {
        take: 5,
        orderBy: { joinedAt: "desc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

// ========== EVENT MANAGEMENT ==========

const getAllEventsAdmin = async (
  query: IQueryParams,
): Promise<IQueryResult<Event>> => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
    searchTerm,
    type,
    isFeatured,
  } = query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.EventWhereInput = {};

  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { venue: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (type) {
    where.type = type as Prisma.EnumEventTypeFilter;
  }

  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured === "true";
  }

  const [data, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            participants: true,
            reviews: true,
            payments: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    data: data as unknown as Event[],
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const deleteEvent = async (eventId: string): Promise<Event> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  const deletedEvent = await prisma.event.delete({
    where: { id: eventId },
  });

  return deletedEvent;
};

// ========== REVIEW MANAGEMENT ==========

const getAllReviewsAdmin = async (
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

  const [data, total] = await Promise.all([
    prisma.review.findMany({
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
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.review.count(),
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

const deleteReview = async (reviewId: string): Promise<Review> => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  const deletedReview = await prisma.review.delete({
    where: { id: reviewId },
  });

  return deletedReview;
};

// ========== DASHBOARD STATS ==========

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalEvents,
    totalReviews,
    totalPayments,
    activeUsers,
    blockedUsers,
    recentEvents,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.review.count(),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { status: UserStatus.BLOCKED } }),
    prisma.event.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        date: true,
        type: true,
        fee: true,
        isFeatured: true,
        createdAt: true,
        _count: {
          select: { participants: true },
        },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    counts: {
      totalUsers,
      totalEvents,
      totalReviews,
      totalPayments,
      activeUsers,
      blockedUsers,
    },
    recentEvents,
    recentUsers,
  };
};

export const adminService = {
  getAllUsers,
  updateUserStatus,
  getUserById,
  getAllEventsAdmin,
  deleteEvent,
  getAllReviewsAdmin,
  deleteReview,
  getDashboardStats,
};
