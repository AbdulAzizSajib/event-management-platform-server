import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { categoryService } from "./category.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.createCategory(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.getAllCategories();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.updateCategory(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category deleted successfully",
  });
});

export const categoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
