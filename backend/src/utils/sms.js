import twilio from 'twilio';

function looksConfigured(value, placeholder) {
  return Boolean(value) && value !== placeholder;
}

export const twilioConfigured =
  looksConfigured(process.env.TWILIO_ACCOUNT_SID, 'your_twilio_account_sid_here') &&
  looksConfigured(process.env.TWILIO_AUTH_TOKEN, 'your_twilio_auth_token_here') &&
  looksConfigured(process.env.TWILIO_PHONE_NUMBER, 'your_twilio_phone_number_here');

const client = twilioConfigured ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

if (!twilioConfigured) {
  console.log('ℹ Twilio not configured — SMS notifications will be logged to the console instead.');
}

// Sends a real SMS when Twilio is configured; otherwise logs it so the notification
// hook points are still exercisable end-to-end during development.
export async function sendSMS(to, body) {
  if (!to) return;

  if (!twilioConfigured) {
    console.log(`[SMS mock] to ${to}: ${body}`);
    return;
  }

  try {
    await client.messages.create({ to, from: process.env.TWILIO_PHONE_NUMBER, body });
  } catch (err) {
    // Notification failures should never break the underlying order/dispatch flow.
    console.error(`Failed to send SMS to ${to}:`, err.message);
  }
}
