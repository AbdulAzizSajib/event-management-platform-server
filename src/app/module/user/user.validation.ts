import z from "zod";

export const createAdminZodSchema = z.object({
  password: z
    .string("Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters"),
  admin: z.object({
    name: z
      .string("Name is required and must be string")
      .min(5, "Name must be at least 5 characters")
      .max(30, "Name must be at most 30 characters"),
    email: z.email("Invalid email address"),
    contactNumber: z
      .string("Contact number is required")
      .min(11, "Contact number must be at least 11 characters")
      .max(14, "Contact number must be at most 15 characters")
      .optional(),
    profilePhoto: z.url("Profile photo must be a valid URL").optional(),
  }),
  role: z.enum(
    ["ADMIN", "SUPER_ADMIN"],
    "Role must be either ADMIN or SUPER_ADMIN",
  ),
});

export const updateProfileZodSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .optional(),
  phone: z
    .string()
    .min(11, "Phone must be at least 11 characters")
    .max(14, "Phone must be at most 14 characters")
    .optional(),
  image: z.string().url("Image must be a valid URL").optional(),
});

export const UserValidation = {
  createAdminZodSchema,
  updateProfileZodSchema,
};
