import { Router } from "express";
import { categoryController } from "./category.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CategoryValidation } from "./category.validation";
import { Role } from "../../../generated/prisma/enums";

const categoryRouter = Router();

// Public - get all categories
categoryRouter.get("/", categoryController.getAllCategories);

// Admin only - create, update, delete
categoryRouter.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(CategoryValidation.createCategoryZodSchema),
  categoryController.createCategory,
);

categoryRouter.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  categoryController.updateCategory,
);

categoryRouter.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  categoryController.deleteCategory,
);

export default categoryRouter;
