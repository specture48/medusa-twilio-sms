import { TwilioSmsService } from "../services/twilio-sms";
import { MedusaError } from "@medusajs/framework/utils";
import { NotificationTypes } from "@medusajs/framework/types";

jest.mock("twilio");

describe("TwilioSmsService", () => {
  let mockLogger: any;
  let mockTwilioClient: any;

  beforeEach(() => {
    const twilio = require("twilio");
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };

    twilio.mockReturnValue(mockTwilioClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create valid notification DTOs
  const createNotification = (overrides: Partial<NotificationTypes.ProviderSendNotificationDTO> = {}): NotificationTypes.ProviderSendNotificationDTO => ({
    to: "+19876543210",
    channel: "sms",
    template: "test-template",
    content: { text: "Test message" },
    ...overrides,
  });

  describe("constructor", () => {
    it("should initialize with from_number", () => {
      expect(() => {
        new TwilioSmsService(
          { logger: mockLogger },
          {
            account_sid: "AC123",
            auth_token: "token123",
            from_number: "+1234567890",
          },
        );
      }).not.toThrow();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Twilio SMS provider initialized successfully"
      );
    });

    it("should initialize with messaging_service_sid", () => {
      expect(() => {
        new TwilioSmsService(
          { logger: mockLogger },
          {
            account_sid: "AC123",
            auth_token: "token123",
            messaging_service_sid: "MG123",
          },
        );
      }).not.toThrow();
    });

    it("should throw error if neither from_number nor messaging_service_sid is provided", () => {
      expect(
        () =>
          new TwilioSmsService(
            { logger: mockLogger },
            {
              account_sid: "AC123",
              auth_token: "token123",
            },
          ),
      ).toThrow(MedusaError);
    });

    it("should throw error if account_sid is missing", () => {
      expect(
        () =>
          new TwilioSmsService(
            { logger: mockLogger },
            {
              account_sid: "",
              auth_token: "token123",
              from_number: "+1234567890",
            },
          ),
      ).toThrow(MedusaError);
    });

    it("should throw error if auth_token is missing", () => {
      expect(
        () =>
          new TwilioSmsService(
            { logger: mockLogger },
            {
              account_sid: "AC123",
              auth_token: "",
              from_number: "+1234567890",
            },
          ),
      ).toThrow(MedusaError);
    });
  });

  describe("send", () => {
    let twilioSmsService: TwilioSmsService;
    
    beforeEach(() => {
      twilioSmsService = new TwilioSmsService(
        { logger: mockLogger },
        {
          account_sid: "AC123",
          auth_token: "token123",
          from_number: "+1234567890",
        },
      );
    });

    it("should send SMS successfully", async () => {
      const mockMessage = {
        sid: "SM123",
        status: "sent",
        dateCreated: new Date(),
        dateSent: new Date(),
      };

      mockTwilioClient.messages.create.mockResolvedValue(mockMessage);

      const notification = createNotification({
        content: { text: "Hello, world!" },
      });

      const result = await twilioSmsService.send(notification);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: "Hello, world!",
        to: "+19876543210",
        from: "+1234567890",
      });

      expect(result).toEqual({
        id: "SM123",
        status: "sent",
        dateCreated: mockMessage.dateCreated,
        dateSent: mockMessage.dateSent,
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("SMS sent successfully. Message SID: SM123"),
      );
    });

    it("should send SMS with messaging service SID", async () => {
      twilioSmsService = new TwilioSmsService(
        { logger: mockLogger },
        {
          account_sid: "AC123",
          auth_token: "token123",
          messaging_service_sid: "MG123",
        },
      );

      const mockMessage = {
        sid: "SM456",
        status: "sent",
        dateCreated: new Date(),
        dateSent: new Date(),
      };

      mockTwilioClient.messages.create.mockResolvedValue(mockMessage);

      await twilioSmsService.send(createNotification());

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: "Test message",
        to: "+19876543210",
        messagingServiceSid: "MG123",
      });
    });

    it("should send MMS with media URLs", async () => {
      const mockMessage = {
        sid: "SM789",
        status: "sent",
        dateCreated: new Date(),
        dateSent: new Date(),
      };

      mockTwilioClient.messages.create.mockResolvedValue(mockMessage);

      await twilioSmsService.send(createNotification({
        content: { text: "Check this out!" },
        data: {
          mediaUrl: ["https://example.com/image.jpg", "invalid-url"],
        },
      }));

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: "Check this out!",
        to: "+19876543210",
        from: "+1234567890",
        mediaUrl: ["https://example.com/image.jpg"],
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid media URL provided: invalid-url"
      );
    });

    it("should throw error for invalid phone number format", async () => {
      await expect(
        twilioSmsService.send(createNotification({
          to: "1234567890", // Missing + prefix
        })),
      ).rejects.toThrow("Invalid phone number format");
    });

    it("should throw error for missing notification", async () => {
      await expect(twilioSmsService.send(null as any)).rejects.toThrow(
        "No notification information provided",
      );
    });

    it("should throw error for missing recipient", async () => {
      await expect(
        twilioSmsService.send(createNotification({
          to: "",
        })),
      ).rejects.toThrow("Invalid or missing recipient phone number");
    });

    it("should throw error for missing content text", async () => {
      await expect(
        twilioSmsService.send(createNotification({
          content: {} as any,
        })),
      ).rejects.toThrow("SMS notification content must contain text");
    });

    it("should throw error for unsupported channel", async () => {
      await expect(
        twilioSmsService.send(createNotification({
          channel: "email" as any,
        })),
      ).rejects.toThrow("Unsupported channel type: email");
    });

    it("should retry on failure", async () => {
      const error = new Error("Network error");
      (error as any).code = 30001; // Twilio network error
      
      mockTwilioClient.messages.create
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          sid: "SM999",
          status: "sent",
          dateCreated: new Date(),
          dateSent: new Date(),
        });

      const result = await twilioSmsService.send(createNotification({
        content: { text: "Retry test" },
      }));

      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(3);
      expect(result.id).toBe("SM999");
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it("should not retry on validation errors", async () => {
      const error = new Error("Invalid phone number");
      (error as any).code = 20003; // Twilio validation error
      
      mockTwilioClient.messages.create.mockRejectedValueOnce(error);

      await expect(
        twilioSmsService.send(createNotification()),
      ).rejects.toThrow("Twilio validation error");

      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it("should throw error after max retries", async () => {
      const error = new Error("Network error");
      (error as any).code = 30001;
      
      mockTwilioClient.messages.create.mockRejectedValue(error);

      await expect(
        twilioSmsService.send(createNotification()),
      ).rejects.toThrow("Failed to send SMS via Twilio after 3 attempts");

      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(3);
    });
  });
});