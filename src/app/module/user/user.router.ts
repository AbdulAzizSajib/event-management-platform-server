import { Router } from "express";
import { userController } from "./user.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./user.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const userRouter = Router();

// Dashboard
userRouter.get(
  "/dashboard",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  userController.getMyDashboard,
);

// Update profile
userRouter.patch(
  "/profile",
  checkAuth(Role.USER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(UserValidation.updateProfileZodSchema),
  userController.updateProfile,
);

// Create admin (SUPER_ADMIN or ADMIN only)
userRouter.post(
  "/create-admin",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(UserValidation.createAdminZodSchema),
  userController.createAdmin,
);

export default userRouter;
