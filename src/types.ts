export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  from_number?: string;
  messaging_service_sid?: string;
  max_retries?: number;
  retry_delay?: number;
}

export interface TwilioSmsData {
  mediaUrl?: string[];
  [key: string]: any;
}

export interface TwilioMessageOptions {
  body: string;
  to: string;
  from?: string;
  messagingServiceSid?: string;
  mediaUrl?: string[];
}

export interface TwilioSendResult {
  id: string;
  status?: string;
  dateCreated?: Date;
  dateSent?: Date;
}