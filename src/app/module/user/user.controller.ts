import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { userService } from "./user.service";
import status from "http-status";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await userService.createAdmin(payload);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateProfile(req.user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getMyDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getMyDashboard(req.user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard data retrieved successfully",
    data: result,
  });
});

export const userController = {
  createAdmin,
  updateProfile,
  getMyDashboard,
};
