import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { adminService } from "./admin.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";

// ========== USER MANAGEMENT ==========

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllUsers(req.query as IQueryParams);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getUserById(req.params.userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.updateUserStatus(
    req.params.userId as string,
    req.body.status,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `User ${req.body.status.toLowerCase()} successfully`,
    data: result,
  });
});

// ========== EVENT MANAGEMENT ==========

const getAllEventsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllEventsAdmin(
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Events retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  await adminService.deleteEvent(req.params.eventId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event deleted successfully",
  });
});

// ========== REVIEW MANAGEMENT ==========

const getAllReviewsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllReviewsAdmin(
    req.query as IQueryParams,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await adminService.deleteReview(req.params.reviewId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review deleted successfully",
  });
});

// ========== DASHBOARD ==========

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getDashboardStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result,
  });
});

export const adminController = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllEventsAdmin,
  deleteEvent,
  getAllReviewsAdmin,
  deleteReview,
  getDashboardStats,
};
