# Medusa Twilio SMS Plugin (v2 Compatible)

A production-ready Twilio SMS notification provider for Medusa v2 that enables sending SMS notifications to customers.

## Features

- Send SMS notifications using Twilio's messaging API
- Support for MMS (multimedia messages) via mediaUrl
- Full integration with Medusa v2's notification module architecture
- Type-safe implementation using TypeScript
- Support for both direct phone numbers and messaging service SIDs
- Automatic retry logic with configurable attempts
- Comprehensive error handling and validation
- E.164 phone number format validation
- Production-grade logging
- Media URL validation for MMS

## Prerequisites

- Medusa v2 backend
- Twilio account with:
  - Account SID
  - Auth Token
  - Either a phone number for sending SMS OR a Messaging Service SID

## Installation

```bash
yarn add medusa-twilio-sms
```

## Configuration

Add the following environment variables to your `.env` file:

### Option 1: Using a Phone Number (recommended)
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### Option 2: Using a Messaging Service SID
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_MESSAGE_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

In your `medusa-config.ts`:

```typescript
import { defineConfig } from '@medusajs/framework/utils'

export default defineConfig({
  projectConfig: {
    // ... other config
  },
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "medusa-twilio-sms",
            id: "twilio-sms",
            options: {
              channels: ["sms"],
              account_sid: process.env.TWILIO_ACCOUNT_SID,
              auth_token: process.env.TWILIO_AUTH_TOKEN,
              // Use either from_number OR messaging_service_sid
              from_number: process.env.TWILIO_FROM_NUMBER,
              // messaging_service_sid: process.env.TWILIO_MESSAGE_SERVICE_SID,
            }
          }
        ]
      }
    }
  ]
})
```

## Usage

### In a Workflow

```typescript
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

const sendSmsStep = createStep(
  "send-sms-notification",
  async ({ phoneNumber, message }, { container }) => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);

    await notificationModuleService.createNotifications({
      to: phoneNumber,
      channel: "sms",
      content: {
        text: message
      }
    });

    return new StepResponse({ success: true });
  }
);

export const sendSmsWorkflow = createWorkflow(
  "send-sms-workflow",
  ({ phoneNumber, message }) => {
    sendSmsStep({ phoneNumber, message });
    return new WorkflowResponse({ success: true });
  }
);
```

### With Media (MMS)

```typescript
await notificationModuleService.createNotifications({
  to: "+1234567890",
  channel: "sms",
  content: {
    text: "Check out this image!"
  },
  data: {
    mediaUrl: ["https://example.com/image.jpg"]
  }
});
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `account_sid` | `string` | Yes | Your Twilio Account SID |
| `auth_token` | `string` | Yes | Your Twilio Auth Token |
| `from_number` | `string` | No* | The Twilio phone number to send from |
| `messaging_service_sid` | `string` | No* | Your Twilio Messaging Service SID |
| `max_retries` | `number` | No | Maximum retry attempts for failed sends (default: 3) |
| `retry_delay` | `number` | No | Base delay in ms between retries (default: 1000) |

*Note: You must provide either `from_number` OR `messaging_service_sid`, but not both.

## Production Considerations

### Phone Number Validation

The plugin validates all phone numbers to ensure they're in E.164 format (+1234567890). This helps prevent errors and ensures compatibility with Twilio's API.

### Error Handling

The plugin distinguishes between different types of errors:
- **Validation errors** (20000-20999): These are not retried as they indicate invalid input
- **Network/temporary errors**: These are automatically retried with exponential backoff

### Retry Logic

Failed SMS sends are automatically retried with configurable attempts and delays:
```typescript
{
  max_retries: 3,        // Default: 3 attempts
  retry_delay: 1000      // Default: 1 second base delay
}
```

### Logging

The plugin provides comprehensive logging at different levels:
- **INFO**: Successful operations
- **DEBUG**: Detailed operation flow
- **WARN**: Non-critical issues (e.g., invalid media URLs)
- **ERROR**: Failed operations with details

### Security Best Practices

1. **Environment Variables**: Always store sensitive credentials in environment variables
2. **Token Security**: Never commit auth tokens to version control
3. **Phone Number Privacy**: Be mindful of logging phone numbers in production
4. **Rate Limiting**: Consider implementing rate limiting at the application level

### Testing

Run the test suite:
```bash
npm test
# or
npm run test:coverage
```

### Monitoring

For production environments, monitor:
- SMS delivery rates
- Error rates and types
- Retry patterns
- Response times

## Troubleshooting

### Common Issues

1. **"The requested resource was not found"**
   - Verify your Account SID is correct
   - Ensure your account has SMS capabilities enabled

2. **"Invalid phone number"**
   - Ensure phone numbers are in E.164 format (+1234567890)
   - Verify the recipient's country is supported

3. **"Authentication error"**
   - Double-check your auth token
   - Ensure no extra spaces in credentials

## License

MIT