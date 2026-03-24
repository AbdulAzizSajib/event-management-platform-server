/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { CookieUtils } from "../utils/cookie";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import status from "http-status";
import { jwtUtils } from "../utils/jwt";
import { envVars } from "../config/env";

export const checkAuth =
  (...authRoles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      //Session Token Verification
      const sessionToken = CookieUtils.getCookie(
        req,
        "better-auth.session_token",
      );

      if (!sessionToken) {
        throw new Error("Unauthorized access! No session token provided.");
      }

      if (sessionToken) {
        const sessionExits = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            user: true,
          },
        });
        if (sessionExits && sessionExits.user) {
          const user = sessionExits.user;

          const now = new Date();
          const expiredAt = new Date(sessionExits.expiresAt);
          const createdAt = new Date(sessionExits.createdAt);

          const sessionLifetime = expiredAt.getTime() - createdAt.getTime();
          const timeRemaining = expiredAt.getTime() - now.getTime();
          const percentRemaining = (timeRemaining / sessionLifetime) * 100;

          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiredAt.toISOString());
            res.setHeader("X-Time-Remaining", percentRemaining.toString());

            console.log(
              `Session token is nearing expiration. Time remaining: ${percentRemaining.toFixed(2)}%`,
            );
          }

          if (
            user.status === UserStatus.BLOCKED ||
            user.status === UserStatus.DELETED
          ) {
            throw new AppError(
              status.UNAUTHORIZED,
              "User is not allowed to access this resource.",
            );
          }

          if (user.isDeleted) {
            throw new AppError(
              status.UNAUTHORIZED,
              "User account has been deleted.",
            );
          }

          if (authRoles.length > 0 && !authRoles.includes(user.role as Role)) {
            throw new AppError(
              status.FORBIDDEN,
              "You do not have permission to access this resource.",
            );
          }

          req.user = {
            userId: user.id,
            email: user.email,
            role: user.role as Role,
          };

          return next();
        }
      }
      //Access Token Verification
      const accessToken = CookieUtils.getCookie(req, "accessToken");

      if (!accessToken) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! No access token provided.",
        );
      }

      const verifiedToken = jwtUtils.verifyToken(
        accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token.",
        );
      }

      if (
        authRoles.length > 0 &&
        !authRoles.includes(verifiedToken.data!.role as Role)
      ) {
        throw new AppError(
          status.FORBIDDEN,
          "Forbidden access! You do not have permission to access this resource.",
        );
      }

      req.user = {
        userId: verifiedToken.data!.userId,
        email: verifiedToken.data!.email,
        role: verifiedToken.data!.role as Role,
      };

      next();
    } catch (error: any) {
      next(error);
    }
  };
