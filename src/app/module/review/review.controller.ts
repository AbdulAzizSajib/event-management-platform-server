import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { reviewService } from "./review.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.createReview(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.updateReview(
    req.params.reviewId as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await reviewService.deleteReview(
    req.params.reviewId as string,
    req.user.userId,
    req.user.role,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review deleted successfully",
  });
});

const getEventReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.getEventReviews(
    req.params.eventId as string,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event reviews retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.getMyReviews(
    req.user.userId,
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My reviews retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const reviewController = {
  createReview,
  updateReview,
  deleteReview,
  getEventReviews,
  getMyReviews,
};
