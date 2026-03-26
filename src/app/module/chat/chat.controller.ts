import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { chatService } from "./chat.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const startConversation = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.startConversation(
    req.user.userId,
    req.body.eventId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Conversation started successfully",
    data: result,
  });
});

const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.getMyConversations(
    req.user.userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversations retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.getMessages(
    req.params.conversationId as string,
    req.user.userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Messages retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.sendMessage(
    req.params.conversationId as string,
    req.user.userId,
    req.body.content,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const markMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
  const count = await chatService.markMessagesAsRead(
    req.params.conversationId as string,
    req.user.userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `${count} messages marked as read`,
  });
});

export const chatController = {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
};
