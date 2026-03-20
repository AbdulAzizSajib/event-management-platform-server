import z from "zod";

export const updateUserStatusZodSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED", "DELETED"], "Status must be ACTIVE, BLOCKED, or DELETED"),
});

export const AdminValidation = {
  updateUserStatusZodSchema,
};
