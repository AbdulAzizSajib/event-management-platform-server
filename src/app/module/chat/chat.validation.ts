import z from "zod";

const startConversationZodSchema = z.object({
  eventId: z.string("Event ID is required").uuid("Invalid event ID"),
});

const sendMessageZodSchema = z.object({
  content: z
    .string("Message content is required")
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be under 2000 characters"),
});

export const ChatValidation = {
  startConversationZodSchema,
  sendMessageZodSchema,
};
