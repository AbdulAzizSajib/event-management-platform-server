import z from "zod";

export const createCheckoutSessionZodSchema = z.object({
  eventId: z.string("Event ID is required").uuid("Invalid event ID"),
});

export const PaymentValidation = {
  createCheckoutSessionZodSchema,
};
