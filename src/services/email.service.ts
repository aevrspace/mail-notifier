// ./src/services/email.service.ts

import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { Attachment } from "nodemailer/lib/mailer/index.js";

// Load environment variables
dotenv.config();

// Event types for monitoring
export enum EventType {
  ERROR = "error",
  SUCCESS = "success",
  WARNING = "warning",
  INFO = "info",
}

// Impact levels
export enum ImpactLevel {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

// Extended email payload interface
export interface MonitoringEmailPayload {
  to?: string | string[];
  subject: string;
  content: string;
  eventType: EventType;
  impactLevel?: ImpactLevel;
  sourceApplication?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  attachments?: Array<Attachment>;
  customCredentials?: {
    user: string;
    pass: string;
  };
}

export class MonitoringEmailService {
  private transporter!: Transporter;
  private defaultConfig: {
    user: string;
    pass: string;
    defaultToEmail: string;
    host: string;
    port: number;
    secure: boolean;
  };

  constructor(customConfig?: {
    host?: string;
    port?: number;
    secure?: boolean;
    defaultToEmail?: string;
  }) {
    // Initialize with default or custom configuration
    this.defaultConfig = {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      defaultToEmail: process.env.DEFAULT_TO_EMAIL || "",
      host: customConfig?.host || process.env.SMTP_HOST || "smtp.gmail.com",
      port: customConfig?.port || parseInt(process.env.SMTP_PORT || "587"),
      secure:
        customConfig?.secure || process.env.SMTP_SECURE === "true" || false,
    };

    this.initializeTransporter();
  }

  private initializeTransporter(customCredentials?: {
    user: string;
    pass: string;
  }) {
    this.transporter = nodemailer.createTransport({
      host: this.defaultConfig.host,
      port: this.defaultConfig.port,
      secure: this.defaultConfig.secure,
      auth: {
        user: customCredentials?.user || this.defaultConfig.user,
        pass: customCredentials?.pass || this.defaultConfig.pass,
      },
    });
  }

  // Get color and icon based on event type
  private getEventStyling(eventType: EventType): {
    color: string;
    icon: string;
    bgColor: string;
  } {
    switch (eventType) {
      case EventType.ERROR:
        return {
          color: "#dc3545",
          bgColor: "#f8d7da",
          icon: "⛔",
        };
      case EventType.SUCCESS:
        return {
          color: "#28a745",
          bgColor: "#d4edda",
          icon: "✅",
        };
      case EventType.WARNING:
        return {
          color: "#ffc107",
          bgColor: "#fff3cd",
          icon: "⚠️",
        };
      case EventType.INFO:
      default:
        return {
          color: "#17a2b8",
          bgColor: "#d1ecf1",
          icon: "ℹ️",
        };
    }
  }

  // Generate impact badge
  private getImpactBadge(impactLevel?: ImpactLevel): string {
    if (!impactLevel) return "";

    const styles: Record<ImpactLevel, { color: string; bgColor: string }> = {
      [ImpactLevel.CRITICAL]: { color: "white", bgColor: "#721c24" },
      [ImpactLevel.HIGH]: { color: "white", bgColor: "#dc3545" },
      [ImpactLevel.MEDIUM]: { color: "black", bgColor: "#ffc107" },
      [ImpactLevel.LOW]: { color: "white", bgColor: "#6c757d" },
    };

    const style = styles[impactLevel];
    return `
      <span style="
        background-color: ${style.bgColor};
        color: ${style.color};
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
      ">
        ${impactLevel.toUpperCase()}
      </span>
    `;
  }

  // Format JSON for display
  private formatJSON(json: Record<string, any>): string {
    if (!json || Object.keys(json).length === 0) return "";

    let rows = "";
    for (const [key, value] of Object.entries(json)) {
      const displayValue =
        typeof value === "object" ? JSON.stringify(value, null, 2) : value;

      rows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${displayValue}</td>
        </tr>
      `;
    }

    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
        <thead>
          <tr>
            <th style="padding: 8px; background-color: #f8f9fa; border: 1px solid #ddd; text-align: left;">Key</th>
            <th style="padding: 8px; background-color: #f8f9fa; border: 1px solid #ddd; text-align: left;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // Create HTML template for email
  private createEmailTemplate(payload: MonitoringEmailPayload): string {
    const {
      subject,
      content,
      eventType,
      impactLevel,
      sourceApplication,
      timestamp = new Date(),
      metadata,
    } = payload;

    const styling = this.getEventStyling(eventType);
    const impactBadge = this.getImpactBadge(impactLevel);
    const metadataSection = metadata ? this.formatJSON(metadata) : "";
    const appSource = sourceApplication || "System";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 650px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
            .header { background-color: ${
              styling.bgColor
            }; padding: 20px; border-bottom: 5px solid ${styling.color}; }
            .title { display: flex; align-items: center; margin: 0; }
            .event-type { font-size: 14px; font-weight: bold; background-color: ${
              styling.color
            }; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 10px; }
            .content { padding: 20px; background-color: white; }
            .message { background-color: #f8f9fa; border-left: 4px solid ${
              styling.color
            }; padding: 15px; margin-bottom: 20px; }
            .metadata { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; }
            .footer { text-align: center; padding: 15px; color: #6c757d; background-color: #f8f9fa; font-size: 12px; }
            .info-row { display: flex; margin-bottom: 10px; font-size: 13px; color: #666; }
            .info-label { font-weight: bold; width: 100px; }
            .code { font-family: monospace; background-color: #f8f9fa; padding: 2px 4px; border-radius: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">
                <span style="font-size: 24px; margin-right: 10px;">${
                  styling.icon
                }</span>
                <h2 style="margin: 0;">${subject} ${impactBadge}</h2>
              </div>
              <div style="margin-top: 10px;">
                <span class="event-type">${eventType.toUpperCase()}</span>
              </div>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="info-label">Source:</span>
                <span>${appSource}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Time:</span>
                <span>${timestamp.toLocaleString()}</span>
              </div>
              
              <div class="message">
                ${content}
              </div>
              
              ${metadataSection}
            </div>
            <div class="footer">
              <p>This is an automated monitoring email - please do not reply</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Method to verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Failed to verify SMTP connection:", error);
      return false;
    }
  }

  // Send email with monitoring information
  async sendMonitoringEmail(payload: MonitoringEmailPayload): Promise<void> {
    try {
      // If custom credentials provided, reinitialize transporter
      if (payload.customCredentials) {
        this.initializeTransporter(payload.customCredentials);
      }

      const to = payload.to || this.defaultConfig.defaultToEmail;
      if (!to) {
        throw new Error("No recipient email specified");
      }

      const htmlTemplate = this.createEmailTemplate(payload);

      const mailOptions = {
        from: `"System Monitor" <${
          payload.customCredentials?.user || this.defaultConfig.user
        }>`,
        to,
        subject: `[${payload.eventType.toUpperCase()}] ${payload.subject}`,
        html: htmlTemplate,
        attachments: payload.attachments || [],
      };

      await this.transporter.sendMail(mailOptions);

      // If using custom credentials, reset to default transporter after sending
      if (payload.customCredentials) {
        this.initializeTransporter();
      }
    } catch (error) {
      console.error("Failed to send monitoring email:", error);
      throw error;
    }
  }

  // Helper methods for common event types
  async sendErrorAlert(
    options: Omit<MonitoringEmailPayload, "eventType">
  ): Promise<void> {
    return this.sendMonitoringEmail({ ...options, eventType: EventType.ERROR });
  }

  async sendSuccessNotification(
    options: Omit<MonitoringEmailPayload, "eventType">
  ): Promise<void> {
    return this.sendMonitoringEmail({
      ...options,
      eventType: EventType.SUCCESS,
    });
  }

  async sendWarning(
    options: Omit<MonitoringEmailPayload, "eventType">
  ): Promise<void> {
    return this.sendMonitoringEmail({
      ...options,
      eventType: EventType.WARNING,
    });
  }

  async sendInfo(
    options: Omit<MonitoringEmailPayload, "eventType">
  ): Promise<void> {
    return this.sendMonitoringEmail({ ...options, eventType: EventType.INFO });
  }
}
