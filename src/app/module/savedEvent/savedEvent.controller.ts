import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { savedEventService } from "./savedEvent.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const saveEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await savedEventService.saveEvent(
    req.user.userId,
    req.body.eventId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Event saved successfully",
    data: result,
  });
});

const unsaveEvent = catchAsync(async (req: Request, res: Response) => {
  await savedEventService.unsaveEvent(
    req.user.userId,
    req.params.eventId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event unsaved successfully",
  });
});

const getMySavedEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await savedEventService.getMySavedEvents(
    req.user.userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Saved events retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const isEventSaved = catchAsync(async (req: Request, res: Response) => {
  const result = await savedEventService.isEventSaved(
    req.user.userId,
    req.params.eventId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Save status retrieved successfully",
    data: { isSaved: result },
  });
});

export const savedEventController = {
  saveEvent,
  unsaveEvent,
  getMySavedEvents,
  isEventSaved,
};
