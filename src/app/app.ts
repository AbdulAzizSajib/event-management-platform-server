import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import path from "path";
import qs from "qs";
import authRouter from "./module/auth/auth.router";
import userRouter from "./module/user/user.router";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFoundMiddleware } from "./middleware/notFound";

const app = express();

app.set("query parser", (str: string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Better Auth handler (must be before body parsers)
app.use("/api/auth", toNodeHandler(auth));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// server health check
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Server is running...");
});

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

app.use(globalErrorHandler);
app.use(notFoundMiddleware);

export default app;
