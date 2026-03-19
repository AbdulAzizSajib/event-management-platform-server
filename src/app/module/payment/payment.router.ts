import { Router } from "express";
import { paymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentValidation } from "./payment.validation";
import { Role } from "../../../generated/prisma/enums";

const paymentRouter = Router();

// Create Stripe checkout session
paymentRouter.post(
  "/create-checkout-session",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PaymentValidation.createCheckoutSessionZodSchema),
  paymentController.createCheckoutSession,
);

// Get my payments
paymentRouter.get(
  "/my-payments",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  paymentController.getMyPayments,
);

// Verify payment by session ID
paymentRouter.get(
  "/verify/:sessionId",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  paymentController.verifyPayment,
);

// Get payments for a specific event (organizer only)
paymentRouter.get(
  "/event/:eventId",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  paymentController.getPaymentsByEvent,
);

export default paymentRouter;
