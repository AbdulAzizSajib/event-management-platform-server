import { Router } from "express";
import { eventController } from "./event.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { EventValidation } from "./event.validation";
import { Role } from "../../../generated/prisma/enums";

const eventRouter = Router();

// Public routes
eventRouter.get("/", eventController.getAllEvents);

// Authenticated routes (must be before /:id to avoid conflict)
eventRouter.get(
  "/my-events",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  eventController.getMyEvents,
);

eventRouter.post(
  "/",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(EventValidation.createEventZodSchema),
  eventController.createEvent,
);

// Public - single event (after static routes)
eventRouter.get("/:id", eventController.getEventById);

eventRouter.patch(
  "/:id",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(EventValidation.updateEventZodSchema),
  eventController.updateEvent,
);

eventRouter.delete(
  "/:id",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  eventController.deleteEvent,
);

// Admin only
eventRouter.patch(
  "/:id/toggle-featured",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  eventController.toggleFeatured,
);

export default eventRouter;
