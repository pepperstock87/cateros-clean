# CAIN Email Integration Framework

This directory contains the complete email integration system for CAIN (Catering AI Navigator), enabling automated email delivery for proposals, invoices, payment reminders, and general messages.

## Architecture Overview

The email integration consists of four main components:

```
email.ts
└─ Core email sending service using Resend

templates.ts
└─ Professional HTML email templates

email-actions.ts
└─ Action handlers called after user approval

actions/executor.ts
└─ Routes approved actions to email handlers
```

## Components

### 1. Email Service (`email.ts`)

Core email sending functionality using Resend.

```typescript
sendEmail(params: EmailParams): Promise<EmailResult>
```

**Features:**
- Graceful handling of missing `RESEND_API_KEY`
- Structured error responses
- Support for attachments and reply-to addresses
- Logging of send results

**Configuration:**
```env
RESEND_API_KEY=your_api_key_here
EMAIL_FROM=C.A.I.N. <noreply@cateros.com>
```

### 2. Email Templates (`templates.ts`)

Professional HTML templates with:
- Consistent brand styling (brand gold: `#D4A373`, dark background: `#1a1a2e`)
- Fully responsive design (max-width: 600px)
- Inline CSS (no external stylesheets)
- Call-to-action buttons
- Email-safe HTML

**Available Templates:**

#### `proposalEmailTemplate()`
Sends proposal to client with event details and suggested pricing.

```typescript
{
  clientName: string;
  eventName: string;
  eventDate: string;
  suggestedPrice: number;
  companyName: string;
  proposalUrl?: string;
}
```

#### `invoiceEmailTemplate()`
Professional invoice email with payment details and payment link.

```typescript
{
  clientName: string;
  eventName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  companyName: string;
  paymentUrl?: string;
}
```

#### `paymentReminderTemplate()`
Payment reminder with three tones: `gentle`, `firm`, `final`.

```typescript
{
  clientName: string;
  eventName: string;
  amount: number;
  daysOverdue: number;
  companyName: string;
  paymentUrl?: string;
  tone: "gentle" | "firm" | "final";
}
```

- **Gentle**: Friendly reminder tone
- **Firm**: More direct, emphasizes days overdue
- **Final**: Last notice tone with red accent color

#### `generalMessageTemplate()`
Custom message template for flexible communication.

```typescript
{
  clientName: string;
  subject: string;
  body: string;
  companyName: string;
  senderName?: string;
}
```

#### `eventConfirmationTemplate()`
Event confirmation email with full event details.

```typescript
{
  clientName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  guestCount: number;
  companyName: string;
}
```

### 3. Email Action Handlers (`email-actions.ts`)

Execution functions called after user approval in the action queue system.

**Functions:**

#### `executeSendProposal()`
Sends proposal email to client after approval.

```typescript
executeSendProposal({
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
}): Promise<{ success: boolean; error?: string }>
```

#### `executeSendInvoice()`
Sends invoice email with payment details.

```typescript
executeSendInvoice({
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
  invoiceId?: string;
}): Promise<{ success: boolean; error?: string }>
```

#### `executeSendPaymentReminder()`
Sends payment reminder with tone based on days overdue.

```typescript
executeSendPaymentReminder({
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
  amount: number;
  daysOverdue: number;
  tone?: "gentle" | "firm" | "final";
}): Promise<{ success: boolean; error?: string }>
```

#### `executeSendMessage()`
Sends custom message email.

```typescript
executeSendMessage({
  userId: string;
  orgId: string | null;
  clientEmail: string;
  clientName: string;
  subject: string;
  body: string;
  senderName?: string;
}): Promise<{ success: boolean; error?: string }>
```

#### `executeEventConfirmation()`
Sends event confirmation after booking.

```typescript
executeEventConfirmation({
  userId: string;
  orgId: string | null;
  eventId: string;
  clientEmail: string;
  clientName: string;
}): Promise<{ success: boolean; error?: string }>
```

**Features:**
- Automatic company name lookup from `business_settings` table
- Event and client data enrichment from Supabase
- Comprehensive error handling
- Automatic email logging to `cain_email_log` table
- Support for multi-tenant organizations

### 4. Action Executor Integration (`actions/executor.ts`)

The main action executor routes approved email actions to handlers:

```typescript
case "send_proposal":
  result = await executeSendProposal(action);
  break;

case "send_invoice":
  result = await executeEmailSendInvoice(action);
  break;

case "send_payment_reminder":
  result = await executeEmailSendPaymentReminder(action);
  break;

case "send_message":
  result = await executeEmailSendMessage(action);
  break;
```

## Database Schema

### `cain_email_log` Table

Tracks all email sends for auditing and delivery confirmation.

```sql
CREATE TABLE cain_email_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID,
  action_id UUID,
  template_type TEXT,           -- proposal | invoice | reminder | message | confirmation
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  event_id UUID,
  client_id UUID,
  resend_message_id TEXT,       -- From Resend API
  status TEXT DEFAULT 'sent',   -- sent | failed | bounced | opened
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `user_id, created_at DESC` - Primary query path
- `event_id` - Event tracking
- `status, created_at DESC` - Status filtering
- `recipient_email, created_at DESC` - Recipient history

**RLS Policies:**
- Users can view their own email logs
- Service role can insert logs

## Usage Flow

### 1. Action Proposal (in CAIN Chat Engine)

CAIN proposes an email action:

```typescript
{
  action_type: "send_proposal",
  title: "Send Proposal to Client",
  payload: {
    type: "send_proposal",
    proposalId: "prop_123",
    clientEmail: "client@example.com",
    includeAttachment: false
  }
}
```

### 2. User Approval

User reviews the proposed action in the approval queue and clicks "Approve".

### 3. Action Execution

Executor routes to handler:

```typescript
const action = await getApprovedAction(id);
const result = await executeAction(action);
// Routes to executeSendProposal() → sendEmail() → logs to cain_email_log
```

### 4. Email Delivery

Email is sent via Resend and logged with delivery status.

### 5. Logging

Entry created in `cain_email_log`:

```typescript
{
  user_id: "user_123",
  organization_id: "org_456",
  template_type: "proposal",
  recipient_email: "client@example.com",
  subject: "Your Event Proposal",
  resend_message_id: "msg_xyz",
  status: "sent"
}
```

## Error Handling

All email functions follow consistent error handling:

```typescript
if (!result.success) {
  // Log failure to cain_email_log with error message
  // Return { success: false, error: "..." }
}
```

**Common Errors:**
- `RESEND_API_KEY not configured` - Email service not set up
- `Event not found` - Event doesn't exist
- `No proposal found for this event` - No proposal to send
- `Could not determine recipient email` - Missing email address

## Email Styling

All templates use:
- **Brand Gold:** `#D4A373` (primary accent)
- **Dark Background:** `#1a1a2e` (header/footer)
- **Text Color:** `#ffffff` (on dark)
- **Light Gray:** `#f5f5f5` (content backgrounds)
- **Max Width:** 600px (mobile responsive)
- **Font Stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`

## Configuration Checklist

Before deploying:

- [ ] Set `RESEND_API_KEY` in production environment
- [ ] Set `EMAIL_FROM` environment variable (optional)
- [ ] Set `NEXT_PUBLIC_APP_URL` for links in emails
- [ ] Run database migration: `supabase-migration-cain-email-log.sql`
- [ ] Test email sending in development
- [ ] Configure Resend webhook for delivery tracking (optional)

## Testing

Unit tests are available in `__tests__/email.test.ts`:

```bash
npm test -- email.test.ts
```

Tests cover:
- Template generation
- Email structure validation
- HTML validity
- Inline CSS verification
- Price formatting
- Date formatting

## Future Enhancements

- [ ] Email tracking pixels for open rates
- [ ] Webhook integration with Resend for delivery confirmation
- [ ] Email template customization per organization
- [ ] SMS integration option
- [ ] Email scheduling/delayed sends
- [ ] Bulk email capabilities
- [ ] Email analytics dashboard
- [ ] Attachment support (PDF proposals/invoices)

## Integration Points

The email system integrates with:

- **Action Executor** (`actions/executor.ts`) - Routes actions
- **Action Queue** (`actions/queue.ts`) - Stores pending actions
- **Business Settings** - Company name lookup
- **Events Table** - Event data enrichment
- **Proposals/Invoices Tables** - Financial data
- **Resend API** - Email delivery

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set in environment
2. Review `cain_email_log` table for errors
3. Verify email address is valid
4. Check Resend dashboard for API issues

### Emails not logged

1. Verify `cain_email_log` table exists (run migration)
2. Check RLS policies are correct
3. Verify `user_id` matches authenticated user

### Styling issues

1. Ensure using email client that supports inline CSS
2. Check for email client CSS stripping
3. Test in multiple email clients
4. Use MJML for complex layouts (future)

## Dependencies

- `resend` - Email delivery service
- `@supabase/supabase-js` - Database operations
- `date-fns` - Date formatting

## Security Considerations

- Email content is logged but passwords/sensitive data must not be included
- User emails are stored in logs for audit purposes
- RLS ensures users only see their own email logs
- No API keys or tokens should be included in email content
