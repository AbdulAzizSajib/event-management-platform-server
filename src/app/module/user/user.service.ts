/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { User } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateAdmin } from "./user.interface";

const createAdmin = async (payload: ICreateAdmin) => {
  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.admin.email,
    },
  });

  if (userExists) {
    throw new AppError(status.CONFLICT, "User with this email already exists");
  }

  const { admin, role, password } = payload;
  const userData = await auth.api.signUpEmail({
    body: {
      ...admin,
      password,
      role,
      needPasswordChange: true,
    },
  });

  try {
    const adminData = await prisma.admin.create({
      data: {
        userId: userData.user.id,
        ...admin,
      },
    });

    return adminData;
  } catch (error: any) {
    console.log(error);
    await prisma.user.delete({
      where: { id: userData.user.id },
    });
    throw new Error("Failed to create admin", { cause: error });
  }
};

const updateProfile = async (
  userId: string,
  payload: { name?: string; phone?: string; image?: string },
): Promise<User> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
  });

  return updatedUser;
};

const getMyDashboard = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const [
    organizedEvents,
    participations,
    pendingInvitations,
    myReviews,
    organizedCount,
    participationCount,
    invitationCount,
    reviewCount,
  ] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        date: true,
        type: true,
        fee: true,
        isFeatured: true,
        _count: {
          select: { participants: true, reviews: true },
        },
      },
    }),
    prisma.participant.findMany({
      where: { userId },
      take: 5,
      orderBy: { joinedAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            type: true,
            venue: true,
          },
        },
      },
    }),
    prisma.invitation.findMany({
      where: { inviteeId: userId, status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.event.count({ where: { organizerId: userId } }),
    prisma.participant.count({ where: { userId } }),
    prisma.invitation.count({ where: { inviteeId: userId, status: "PENDING" } }),
    prisma.review.count({ where: { userId } }),
  ]);

  return {
    counts: {
      organizedEvents: organizedCount,
      participations: participationCount,
      pendingInvitations: invitationCount,
      reviews: reviewCount,
    },
    recentOrganizedEvents: organizedEvents,
    recentParticipations: participations,
    pendingInvitations,
    recentReviews: myReviews,
  };
};

export const userService = {
  createAdmin,
  updateProfile,
  getMyDashboard,
};
