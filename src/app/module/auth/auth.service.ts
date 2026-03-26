import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { jwtUtils } from "../../utils/jwt";
import { envVars } from "../../config/env";
import { JwtPayload } from "jsonwebtoken";
import { IChangePasswordPayload } from "./auth.interface";

interface IRegisterUserPayload {
  name: string;
  email: string;
  password: string;
}

const registerUser = async (payload: IRegisterUserPayload) => {
  const { name, email, password } = payload;
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data.user) {
    throw new AppError(status.BAD_REQUEST, "Failed to register user");
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

interface ILoginUserPayload {
  email: string;
  password: string;
}

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;
  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (!data.user.emailVerified) {
    throw new AppError(
      status.FORBIDDEN,
      "Please verify your email before logging in. Check your inbox for the verification code.",
    );
  }

  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account is blocked. Please contact support.",
    );
  }

  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account has been deleted. Please contact support.",
    );
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const isUserExist = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      admin: true,
      organizedEvents: true,
      participants: {
        include: {
          event: true,
        },
      },
      reviews: true,
      invitations: true,
      invitedTo: true,
    },
  });
  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  return isUserExist;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
  // Try exact match first, then decoded/encoded variants
  let isSessionExits = await prisma.session.findUnique({
    where: { token: sessionToken },
  });

  // Fallback: try decoded version (Google login may URL-encode the token)
  if (!isSessionExits) {
    try {
      const decoded = decodeURIComponent(sessionToken);
      if (decoded !== sessionToken) {
        isSessionExits = await prisma.session.findUnique({
          where: { token: decoded },
        });
      }
    } catch {
      // ignore decode errors
    }
  }

  if (!isSessionExits) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const verifiedRefreshToken = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET,
  );
  if (!verifiedRefreshToken.success && verifiedRefreshToken.error) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const newAccessToken = tokenUtils.getAccessToken({
    userId: data.userId,
    email: data.email,
    name: data.name,
    role: data.role,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });
  const newRefreshToken = tokenUtils.getRefreshToken({
    userId: data.userId,
    email: data.email,
    name: data.name,
    role: data.role,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });

  const sessionUpdateData = await prisma.session.update({
    where: {
      token: sessionToken,
    },
    data: {
      token: sessionToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      updatedAt: new Date(),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: sessionUpdateData.token,
  };
};

const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string,
) => {
  const session = await auth.api.getSession({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
  if (!session) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }
  const { currentPassword, newPassword } = payload;

  const result = await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (session.user.needPasswordChange) {
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        needPasswordChange: false,
      },
    });
  }
  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const logoutUser = async (sessionToken: string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
  return result;
};

const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        emailVerified: true,
      },
    });
  }
};

const forgetPassword = async (email: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!isUserExist.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!isUserExist.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  if (isUserExist.needPasswordChange) {
    await prisma.user.update({
      where: {
        id: isUserExist.id,
      },
      data: {
        needPasswordChange: false,
      },
    });
  }

  await prisma.session.deleteMany({
    where: {
      userId: isUserExist.id,
    },
  });
};

const resendOTP = async (email: string, type: "email-verification" | "forget-password") => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (type === "email-verification" && user.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email is already verified");
  }

  await auth.api.sendVerificationOTP({
    body: {
      email,
      type,
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleLoginSuccess = async (session: Record<string, any>) => {
  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  return {
    accessToken,
    refreshToken,
  };
};

export const authService = {
  registerUser,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  resendOTP,
  googleLoginSuccess,
};
