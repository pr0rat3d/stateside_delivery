import { Resend } from 'resend';

function looksConfigured(value, placeholder) {
  return Boolean(value) && value !== placeholder;
}

export const resendConfigured = looksConfigured(process.env.RESEND_API_KEY, 'your_resend_api_key_here');

const client = resendConfigured ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RECEIPT_FROM_EMAIL || 'Stateside Deliveries <onboarding@resend.dev>';

if (!resendConfigured) {
  console.log('ℹ Resend not configured — receipt emails will be logged to the console instead.');
}

// Sends a real email when Resend is configured; otherwise logs it so the notification
// hook points are still exercisable end-to-end during development.
export async function sendEmail(to, subject, html) {
  if (!to) return;

  if (!resendConfigured) {
    console.log(`[Email mock] to ${to}: ${subject}\n${html}`);
    return;
  }

  try {
    await client.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    // Notification failures should never break the underlying order flow.
    console.error(`Failed to send email to ${to}:`, err.message);
  }
}

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

export function renderOrderReceiptEmail(order, items) {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.quantity} × ${item.name}</td><td style="text-align:right">${formatCurrency(
          item.price_per_unit * item.quantity
        )}</td></tr>`
    )
    .join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Thanks for your order!</h2>
      <p>Order #${order.id} has been placed and is on its way.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows}
        <tr><td style="padding-top: 8px;">Subtotal</td><td style="text-align:right; padding-top: 8px;">${formatCurrency(order.subtotal)}</td></tr>
        <tr><td>Delivery fee</td><td style="text-align:right">${formatCurrency(order.delivery_fee)}</td></tr>
        <tr><td>Service fee</td><td style="text-align:right">${formatCurrency(order.service_fee)}</td></tr>
        <tr><td>Tax</td><td style="text-align:right">${formatCurrency(order.tax)}</td></tr>
        <tr><td>Tip</td><td style="text-align:right">${formatCurrency(order.tip)}</td></tr>
        <tr><td style="font-weight: bold; padding-top: 8px;">Total</td><td style="text-align:right; font-weight: bold; padding-top: 8px;">${formatCurrency(order.total)}</td></tr>
      </table>
      <p>We'll text you updates as your order makes its way to you.</p>
    </div>
  `;

  return { subject: `Your Stateside Deliveries receipt — order #${order.id}`, html };
}
