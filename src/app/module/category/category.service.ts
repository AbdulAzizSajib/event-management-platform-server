import status from "http-status";
import { Category } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const createCategory = async (payload: {
  name: string;
  icon?: string;
}): Promise<Category> => {
  const existingCategory = await prisma.category.findUnique({
    where: { name: payload.name },
  });

  if (existingCategory) {
    throw new AppError(
      status.CONFLICT,
      "Category with this name already exists",
    );
  }

  const category = await prisma.category.create({
    data: payload,
  });

  return category;
};

const getAllCategories = async (): Promise<Category[]> => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { events: true },
      },
    },
  });

  return categories as unknown as Category[];
};

const updateCategory = async (
  id: string,
  payload: { name?: string; icon?: string },
): Promise<Category> => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  if (payload.name && payload.name !== category.name) {
    const existing = await prisma.category.findUnique({
      where: { name: payload.name },
    });
    if (existing) {
      throw new AppError(
        status.CONFLICT,
        "Category with this name already exists",
      );
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: payload,
  });

  return updatedCategory;
};

const deleteCategory = async (id: string): Promise<Category> => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { events: true },
      },
    },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  if ((category as any)._count.events > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot delete category. ${(category as any)._count.events} events are using this category.`,
    );
  }

  const deletedCategory = await prisma.category.delete({
    where: { id },
  });

  return deletedCategory;
};

export const categoryService = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
