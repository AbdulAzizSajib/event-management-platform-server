/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const createToken = (
  payload: JwtPayload,
  secret: string,
  options: SignOptions,
) => {
  const token = jwt.sign(
    payload,
    secret,
    options.expiresIn ? { expiresIn: options.expiresIn } : {},
  );
  return token;
};
const verifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return {
      success: true,
      data: decoded,
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while verifying the token.",
      error,
    };
  }
};
const decodeToken = (token: string) => {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded) {
    return {
      success: false,
      message: "Failed to decode token.",
    };
  }
  return {
    success: true,
    data: decoded,
  };
};

export const jwtUtils = {
  createToken,
  verifyToken,
  decodeToken,
};
