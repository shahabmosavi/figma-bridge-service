import dotenv from "dotenv";
import pino from "pino";

import { app } from "./app";

dotenv.config();

const logger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "info"
});

const port = Number(process.env.PORT ?? 3005);

app.listen(port, () => {
  logger.info(
    {
      service: "figma-bridge-service",
      port,
      environment: process.env.NODE_ENV ?? "development"
    },
    "Service started"
  );
});
