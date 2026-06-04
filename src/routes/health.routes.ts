import { Router } from "express";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  console.log("[health] called", {
    timestamp: new Date().toISOString()
  });

  res.status(200).json({
    status: "ok",
    service: "figma-bridge-service"
  });
});
