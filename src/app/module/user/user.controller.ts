import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { userService } from "./user.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await userService.createAdmin(payload);
  sendResponse(res, {
    httpStatusCode: 201,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});

export const userController = {
  createAdmin,
};
