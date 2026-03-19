import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { participantService } from "./participant.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await participantService.joinEvent(
    req.user.userId,
    req.body.eventId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Successfully joined the event",
    data: result,
  });
});

const getEventParticipants = catchAsync(
  async (req: Request, res: Response) => {
    const result = await participantService.getEventParticipants(
      req.params.eventId as string,
      req.query as IQueryParams,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Participants retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getMyParticipations = catchAsync(
  async (req: Request, res: Response) => {
    const result = await participantService.getMyParticipations(
      req.user.userId,
      req.query as IQueryParams,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "My participations retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const updateParticipantStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await participantService.updateParticipantStatus(
      req.params.participantId as string,
      req.user.userId,
      req.body.status,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: `Participant ${req.body.status.toLowerCase()} successfully`,
      data: result,
    });
  },
);

const cancelParticipation = catchAsync(
  async (req: Request, res: Response) => {
    await participantService.cancelParticipation(
      req.params.eventId as string,
      req.user.userId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Participation cancelled successfully",
    });
  },
);

export const participantController = {
  joinEvent,
  getEventParticipants,
  getMyParticipations,
  updateParticipantStatus,
  cancelParticipation,
};
