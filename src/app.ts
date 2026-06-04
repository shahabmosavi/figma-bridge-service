import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { debugRoutes } from "./routes/debug.routes";
import { designSystemRoutes } from "./routes/design-system.routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { figmaRoutes } from "./routes/figma.routes";
import { healthRoutes } from "./routes/health.routes";

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((req, _res, next) => {
  console.log("[request]", {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin || "",
    userAgent: req.headers["user-agent"] || ""
  });
  next();
});
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "ngrok-skip-browser-warning"],
  credentials: false
}));
app.options("*", cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "ngrok-skip-browser-warning"],
  credentials: false
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.use("/health", healthRoutes);
app.use("/debug", debugRoutes);
app.use("/design-system", designSystemRoutes);
app.use("/figma", figmaRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
