import z from "zod";

export const createReviewZodSchema = z.object({
  eventId: z.string("Event ID is required").uuid("Invalid event ID"),
  rating: z
    .number("Rating is required")
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z
    .string("Comment is required")
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment cannot exceed 1000 characters"),
});

export const updateReviewZodSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5")
    .optional(),
  comment: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment cannot exceed 1000 characters")
    .optional(),
});

export const ReviewValidation = {
  createReviewZodSchema,
  updateReviewZodSchema,
};
