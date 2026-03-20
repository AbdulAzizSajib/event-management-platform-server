import z from "zod";

export const createCategoryZodSchema = z.object({
  name: z
    .string("Category name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  icon: z.string().url("Icon must be a valid URL").optional(),
});

export const updateCategoryZodSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .optional(),
  icon: z.string().url("Icon must be a valid URL").optional(),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
