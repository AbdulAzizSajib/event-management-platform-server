import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { eventService } from "./event.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const createEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.createEvent(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Event created successfully",
    data: result,
  });
});

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.getAllEvents(req.query as IQueryParams);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Events retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getEventById = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.getEventById(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event retrieved successfully",
    data: result,
  });
});

const getMyEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.getMyEvents(
    req.user.userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My events retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.updateEvent(
    req.params.id as string,
    req.user.userId,
    req.user.role,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event updated successfully",
    data: result,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  await eventService.deleteEvent(
    req.params.id as string,
    req.user.userId,
    req.user.role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event deleted successfully",
  });
});

const toggleFeatured = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.toggleFeatured(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Event ${result.isFeatured ? "featured" : "unfeatured"} successfully`,
    data: result,
  });
});

export const eventController = {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  toggleFeatured,
};
