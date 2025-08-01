import { Logger, NotificationTypes } from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import twilio from "twilio";
import { Twilio } from "twilio";
import { 
  TwilioConfig, 
  TwilioSmsData, 
  TwilioMessageOptions, 
  TwilioSendResult 
} from "../types";

type InjectedDependencies = {
  logger: Logger;
};

export class TwilioSmsService extends AbstractNotificationProviderService {
  static identifier = "twilio-sms";
  protected logger_: Logger;
  protected twilioClient_: Twilio;
  protected fromNumber_?: string;
  protected messagingServiceSid_?: string;
  protected maxRetries_: number;
  protected retryDelay_: number;

  constructor({ logger }: InjectedDependencies, options: TwilioConfig) {
    super();

    this.logger_ = logger;

    if (!options.account_sid || !options.auth_token) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Twilio SMS plugin requires account_sid and auth_token in options",
      );
    }

    if (!options.from_number && !options.messaging_service_sid) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Twilio SMS plugin requires either from_number or messaging_service_sid in options",
      );
    }

    this.twilioClient_ = twilio(options.account_sid, options.auth_token);
    this.fromNumber_ = options.from_number;
    this.messagingServiceSid_ = options.messaging_service_sid;
    this.maxRetries_ = options.max_retries || 3;
    this.retryDelay_ = options.retry_delay || 1000;

    this.logger_.info("Twilio SMS provider initialized successfully");
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO,
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided",
      );
    }

    const { to, content, data, channel } = notification;

    this.logger_.debug(`Attempting to send SMS to ${to}`);

    if (!to || typeof to !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid or missing recipient phone number",
      );
    }

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid phone number format: ${to}. Must be in E.164 format (e.g., +1234567890)`,
      );
    }

    if (!content?.text) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMS notification content must contain text",
      );
    }

    if (channel && channel !== "sms") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Unsupported channel type: ${channel}. Only 'sms' is supported.`,
      );
    }

    // Build message options
    const messageOptions: TwilioMessageOptions = {
      body: content.text,
      to,
    };

    // Use messaging service SID if available, otherwise use from number
    if (this.messagingServiceSid_) {
      messageOptions.messagingServiceSid = this.messagingServiceSid_;
    } else if (this.fromNumber_) {
      messageOptions.from = this.fromNumber_;
    }

    // Handle additional data
    if (data && typeof data === "object") {
      const smsData = data as TwilioSmsData;
      if (smsData.mediaUrl && Array.isArray(smsData.mediaUrl)) {
        // Validate media URLs
        const validatedUrls = smsData.mediaUrl.filter(url => {
          try {
            new URL(url);
            return true;
          } catch {
            this.logger_.warn(`Invalid media URL provided: ${url}`);
            return false;
          }
        });
        
        if (validatedUrls.length > 0) {
          messageOptions.mediaUrl = validatedUrls;
        }
      }
    }

    // Send with retry logic
    return await this.sendWithRetry(messageOptions);
  }

  private async sendWithRetry(
    messageOptions: TwilioMessageOptions
  ): Promise<TwilioSendResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries_; attempt++) {
      try {
        this.logger_.debug(`Sending SMS attempt ${attempt}/${this.maxRetries_}`);
        
        const message = await this.twilioClient_.messages.create(messageOptions);
        
        this.logger_.info(
          `SMS sent successfully. Message SID: ${message.sid}, Status: ${message.status}`
        );
        
        return {
          id: message.sid,
          status: message.status,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
        };
      } catch (error) {
        lastError = error as Error;
        this.logger_.error(
          `Twilio SMS send error (attempt ${attempt}/${this.maxRetries_}): ${(error as Error).message}`
        );
        
        // Don't retry on validation errors
        if ((error as any).code >= 20000 && (error as any).code < 21000) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Twilio validation error: ${(error as Error).message}`,
          );
        }
        
        // Wait before retrying (except on last attempt)
        if (attempt < this.maxRetries_) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay_ * attempt));
        }
      }
    }
    
    // All retries failed
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to send SMS via Twilio after ${this.maxRetries_} attempts: ${lastError?.message}`,
    );
  }
}
