import status from "http-status";
import { Conversation, Message, Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, IQueryResult } from "../../interfaces/query.interface";

const startConversation = async (
  userId: string,
  eventId: string,
): Promise<Conversation> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found");
  }

  // Can't chat with yourself
  if (event.organizerId === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot start a conversation for your own event",
    );
  }

  // Check if conversation already exists
  const existing = await prisma.conversation.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
    include: {
      event: {
        select: { id: true, title: true, image: true },
      },
      user: {
        select: { id: true, name: true, image: true },
      },
      organizer: {
        select: { id: true, name: true, image: true },
      },
      _count: { select: { messages: true } },
    },
  });

  if (existing) {
    return existing;
  }

  const conversation = await prisma.conversation.create({
    data: {
      eventId,
      userId,
      organizerId: event.organizerId,
    },
    include: {
      event: {
        select: { id: true, title: true, image: true },
      },
      user: {
        select: { id: true, name: true, image: true },
      },
      organizer: {
        select: { id: true, name: true, image: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return conversation;
};

const getMyConversations = async (
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Conversation>> => {
  const { page = "1", limit = "20" } = query;
  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ConversationWhereInput = {
    OR: [{ userId }, { organizerId: userId }],
  };

  const [data, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        event: {
          select: { id: true, title: true, image: true },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
        organizer: {
          select: { id: true, name: true, image: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: userId },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.conversation.count({ where }),
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

const getMessages = async (
  conversationId: string,
  userId: string,
  query: IQueryParams,
): Promise<IQueryResult<Message>> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found");
  }

  // Only participants can view messages
  if (conversation.userId !== userId && conversation.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a participant of this conversation",
    );
  }

  const { page = "1", limit = "50" } = query;
  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.MessageWhereInput = { conversationId };

  const [data, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.message.count({ where }),
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

const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
): Promise<Message> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found");
  }

  if (conversation.userId !== senderId && conversation.organizerId !== senderId) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a participant of this conversation",
    );
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
};

const markMessagesAsRead = async (
  conversationId: string,
  userId: string,
): Promise<number> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found");
  }

  if (conversation.userId !== userId && conversation.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not a participant of this conversation",
    );
  }

  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return result.count;
};

export const chatService = {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
};
