import { Router } from "express";
import { savedEventController } from "./savedEvent.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SavedEventValidation } from "./savedEvent.validation";
import { Role } from "../../../generated/prisma/enums";

const savedEventRouter = Router();

// Save an event
savedEventRouter.post(
  "/",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(SavedEventValidation.saveEventZodSchema),
  savedEventController.saveEvent,
);

// Get my saved events
savedEventRouter.get(
  "/",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  savedEventController.getMySavedEvents,
);

// Check if event is saved
savedEventRouter.get(
  "/status/:eventId",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  savedEventController.isEventSaved,
);

// Unsave an event
savedEventRouter.delete(
  "/:eventId",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  savedEventController.unsaveEvent,
);

export default savedEventRouter;
