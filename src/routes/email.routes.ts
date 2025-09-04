// ./src/routes/email.routes.ts

import { Router } from "express";
import {
  MonitoringEmailService,
  EventType,
  ImpactLevel,
} from "../services/email.service.js";

const router = Router();
const emailService = new MonitoringEmailService();

// Email webhook route - handles monitoring alerts and notifications
router.post("/webhook/email", async (req, res) => {
  try {
    const {
      to,
      subject,
      content,
      eventType = EventType.INFO,
      impactLevel,
      sourceApplication,
      metadata,
      attachments,
      customCredentials,
    } = req.body;

    // Validate required fields
    if (!subject || !content) {
      res.status(400).json({
        error: "Missing required fields",
        details: "Subject and content are required",
      });
    }

    // Validate event type if provided
    if (eventType && !Object.values(EventType).includes(eventType)) {
      res.status(400).json({
        error: "Invalid eventType",
        details: `Event type must be one of: ${Object.values(EventType).join(
          ", "
        )}`,
      });
    }

    // Validate impact level if provided
    if (impactLevel && !Object.values(ImpactLevel).includes(impactLevel)) {
      res.status(400).json({
        error: "Invalid impactLevel",
        details: `Impact level must be one of: ${Object.values(
          ImpactLevel
        ).join(", ")}`,
      });
    }

    // Send email asynchronously
    setImmediate(async () => {
      try {
        // Choose appropriate method based on event type
        switch (eventType) {
          case EventType.ERROR:
            await emailService.sendErrorAlert({
              to,
              subject,
              content,
              impactLevel,
              sourceApplication,
              metadata,
              attachments,
              customCredentials,
            });
            break;
          case EventType.SUCCESS:
            await emailService.sendSuccessNotification({
              to,
              subject,
              content,
              impactLevel,
              sourceApplication,
              metadata,
              attachments,
              customCredentials,
            });
            break;
          case EventType.WARNING:
            await emailService.sendWarning({
              to,
              subject,
              content,
              impactLevel,
              sourceApplication,
              metadata,
              attachments,
              customCredentials,
            });
            break;
          case EventType.INFO:
          default:
            await emailService.sendInfo({
              to,
              subject,
              content,
              impactLevel,
              sourceApplication,
              metadata,
              attachments,
              customCredentials,
            });
            break;
        }
        console.log(`Email sent successfully: [${eventType}] ${subject}`);
      } catch (err) {
        console.error("Background email sending failed:", err);
      }
    });

    // Return immediate success response
    res.status(202).json({
      message: "Email will be sent in the background",
      eventType: eventType,
    });
  } catch (error) {
    console.error("Error processing email webhook:", error);
    res.status(500).json({
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
});

// Add a route for checking email service status
router.get("/webhook/email/status", async (req, res) => {
  try {
    const isConnected = await emailService.verifyConnection();
    if (isConnected) {
      res.status(200).json({
        status: "operational",
        message: "Email service is connected and operational",
      });
    } else {
      res.status(503).json({
        status: "unavailable",
        message: "Email service is not connected",
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: (error as Error).message });
  }
});

export default router;
