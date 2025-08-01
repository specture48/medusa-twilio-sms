import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { TwilioSmsService } from "./services/twilio-sms";

const services = [TwilioSmsService];

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
});

export * from "./types";