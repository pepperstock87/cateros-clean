/**
 * CAIN Integrations Barrel Export
 * Central export point for all integration modules
 */

export { sendEmail, type EmailParams, type EmailResult } from "./email";
export {
  proposalEmailTemplate,
  invoiceEmailTemplate,
  paymentReminderTemplate,
  generalMessageTemplate,
  eventConfirmationTemplate,
} from "./templates";
export {
  executeSendProposal,
  executeSendInvoice,
  executeSendPaymentReminder,
  executeSendMessage,
  executeEventConfirmation,
} from "./email-actions";
