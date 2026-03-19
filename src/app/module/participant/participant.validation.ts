import z from "zod";

export const joinEventZodSchema = z.object({
  eventId: z.string("Event ID is required").uuid("Invalid event ID"),
});

export const updateParticipantStatusZodSchema = z.object({
  status: z.enum(
    ["APPROVED", "REJECTED", "BANNED"],
    "Status must be APPROVED, REJECTED, or BANNED",
  ),
});

export const ParticipantValidation = {
  joinEventZodSchema,
  updateParticipantStatusZodSchema,
};
