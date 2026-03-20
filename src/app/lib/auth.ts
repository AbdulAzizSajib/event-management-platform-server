import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { envVars } from "../config/env";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { sendEmail } from "../utils/email";

export const auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            console.error(`User with email ${email} not found.`);
            return;
          }

          if (user.role === Role.SUPER_ADMIN) {
            console.log(`Super admin ${email} — skipping OTP.`);
            return;
          }

          if (!user.emailVerified) {
            sendEmail({
              to: email,
              subject: "Verify Your Email - Event Management Platform",
              templateName: "otp",
              templateData: { name: user.name, otp },
            });
          }
        } else if (type === "forget-password") {
          const user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            sendEmail({
              to: email,
              subject: "Password Reset OTP - Event Management Platform",
              templateName: "otp",
              templateData: { name: user.name, otp },
            });
          }
        }
      },
      expiresIn: 2 * 60, // 2 minutes
      otpLength: 6,
    }),
  ],

  emailAndPassword: {
    enabled: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },

  socialProviders: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",

      mapProfileToUser: () => {
        return {
          role: Role.USER,
          status: UserStatus.ACTIVE,
          needPasswordChange: false,
          emailVerified: true,
          isDeleted: false,
          deletedAt: null,
        };
      },
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.USER,
      },

      phone: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE,
      },

      needPasswordChange: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },

      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },

      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null,
      },
    },
  },

  redirectURLs: {
    signIn: `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:5000",
    envVars.FRONTEND_URL,
  ],

  session: {
    expiresIn: 60 * 60 * 60 * 24, // 1 day in seconds
    updateAge: 60 * 60 * 60 * 24, // 1 day in seconds
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 60 * 24, // 1 day in seconds
    },
  },

  // Advance
  advanced: {
    useSecureCookies: false,
    cookies: {
      state: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
      sessionToken: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
    },
  },
});
