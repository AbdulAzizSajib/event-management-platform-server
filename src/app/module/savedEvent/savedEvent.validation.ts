import z from "zod";

const saveEventZodSchema = z.object({
  eventId: z.string("Event ID is required").uuid("Invalid event ID"),
});

export const SavedEventValidation = {
  saveEventZodSchema,
};
