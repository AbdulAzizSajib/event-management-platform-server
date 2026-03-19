/* eslint-disable @typescript-eslint/no-explicit-any */
// import status from "http-status";
// import { Role } from "../../../generated/prisma/client";
// import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateAdmin } from "./user.interface";

const createAdmin = async (payload: ICreateAdmin) => {
  // Step 1: Check if user already exists
  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.admin.email,
    },
  });

  if (userExists) {
    throw new Error("User with this email already exists");
  }

  const { admin, role, password } = payload;
  const userData = await auth.api.signUpEmail({
    body: {
      ...admin,
      password,
      role,
      needPasswordChange: true,
    },
  });

  // Step 3: Create admin profile in transaction
  try {
    const adminData = await prisma.admin.create({
      data: {
        userId: userData.user.id,
        ...admin,
      },
    });

    return adminData;
  } catch (error: any) {
    console.log(error);
    await prisma.user.delete({
      where: { id: userData.user.id },
    });
    throw new Error("Failed to create admin", { cause: error });
  }
};

export const userService = {
  createAdmin,
};
