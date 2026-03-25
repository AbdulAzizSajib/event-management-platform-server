import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
  try {
    // Check by email in admin table — most reliable
    const isSuperAdminExist = await prisma.admin.findFirst({
      where: { email: envVars.ADMIN_EMAIL },
    });

    if (isSuperAdminExist) {
      console.log("admin already exists. Skipping seeding admin.");
      return;
    }

    // Check if user exists but admin record missing (partial failure recovery)
    let superAdminUserId: string;
    const existingUser = await prisma.user.findUnique({
      where: { email: envVars.ADMIN_EMAIL },
    });

    if (existingUser) {
      superAdminUserId = existingUser.id;
    } else {
      const superAdminUser = await auth.api.signUpEmail({
        body: {
          email: envVars.ADMIN_EMAIL,
          password: envVars.ADMIN_PASSWORD,
          name: envVars.ADMIN_NAME,
          role: Role.ADMIN,
          needPasswordChange: false,
          rememberMe: false,
        },
      });
      superAdminUserId = superAdminUser.user.id;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: superAdminUserId },
        data: {
          role: Role.ADMIN,
          emailVerified: true,
        },
      });

      await tx.admin.create({
        data: {
          userId: superAdminUserId,
          name: envVars.ADMIN_NAME,
          email: envVars.ADMIN_EMAIL,
        },
      });
    });

    console.log("Admin Created successfully:", envVars.ADMIN_EMAIL);
  } catch (error) {
    console.error("Error seeding admin: ", error);
  }
};
