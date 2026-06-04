import { Router } from "express";

export const debugRoutes = Router();

debugRoutes.get("/request-info", (req, res) => {
  console.log("[debug/request-info] called", {
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || "",
    userAgent: req.headers["user-agent"] || "",
    host: req.headers.host || ""
  });

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    headers: {
      origin: req.headers.origin || "",
      userAgent: req.headers["user-agent"] || "",
      host: req.headers.host || ""
    },
    service: "figma-bridge-service"
  });
});
