import z from "zod";

export const createEventZodSchema = z.object({
  title: z
    .string("Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string("Description is required")
    .min(10, "Description must be at least 10 characters"),
  date: z.string("Date is required").datetime("Invalid date format"),
  time: z
    .string("Time is required")
    .min(1, "Time is required"),
  venue: z.string().optional(),
  eventLink: z.string().url("Event link must be a valid URL").optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  fee: z.number().min(0, "Fee cannot be negative").optional(),
});

export const updateEventZodSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  date: z.string().datetime("Invalid date format").optional(),
  time: z.string().min(1).optional(),
  venue: z.string().nullable().optional(),
  eventLink: z.string().url("Event link must be a valid URL").nullable().optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  fee: z.number().min(0, "Fee cannot be negative").optional(),
});

export const EventValidation = {
  createEventZodSchema,
  updateEventZodSchema,
};
