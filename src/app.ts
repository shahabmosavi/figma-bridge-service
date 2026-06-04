import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { figmaRoutes } from "./routes/figma.routes";
import { healthRoutes } from "./routes/health.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.use("/health", healthRoutes);
app.use("/figma", figmaRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
