// @ts-nocheck — relocated from api/services/resend.js, the superset implementation (the
// worker/services/resend.js copy only had sendUpgradeNotification and was dropped in Phase 2).
const { Resend } = require('resend')

const client = new Resend(process.env.RESEND_API_KEY)

async function sendUpgradeNotification(request) {
  try {
    await client.emails.send({
      from:    'Clarity Fleet <noreply@claritysoftware.au>',
      to:      process.env.ADMIN_EMAIL,
      subject: `Upgrade request from ${request.companyName}`,
      html: `
        <h2>New upgrade request</h2>
        <p><strong>Company:</strong> ${request.companyName}</p>
        <p><strong>Entry slots:</strong> ${request.entrySlots}</p>
        <p><strong>Mid slots:</strong> ${request.midSlots}</p>
        <p><strong>Top slots:</strong> ${request.topSlots}</p>
        <p><strong>Message:</strong> ${request.message || 'None'}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-AU')}</p>
        <br>
        <p>Log in to your super admin panel to action this request.</p>
      `,
    })
    console.log('[Resend] Upgrade notification sent')
  } catch (err) {
    console.error('[Resend] Email failed:', err.message)
  }
}

// Sends auto-reply to customer with ticket number
async function sendSupportAutoReply(to, name, ticketNumber, subject) {
  try {
    await client.emails.send({
      from:    'Clarity Fleet Support <support@claritysoftware.au>',
      to,
      subject: `Re: ${subject} — Ticket #${ticketNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Clarity Fleet Support</h2>
          <p>Hi ${name},</p>
          <p>Thanks for reaching out. We have received your message and will get back to you within 24 hours.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Your ticket number</p>
            <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #111827;">#${ticketNumber}</p>
          </div>
          <p>Keep this number handy — use it in any follow-up emails to <a href="mailto:support@claritysoftware.au">support@claritysoftware.au</a> and we will pick up right where we left off.</p>
          <p>— Clarity Fleet Support Team</p>
        </div>
      `,
    })
    console.log(`[Resend] Auto-reply sent to ${to} ticket #${ticketNumber}`)
  } catch (err) {
    console.error('[Resend] Auto-reply failed:', err.message)
  }
}

// Notifies you (admin) that a new support ticket came in
async function sendSupportAdminNotification(ticket) {
  try {
    await client.emails.send({
      from:    'Clarity Fleet <noreply@claritysoftware.au>',
      to:      'support@claritysoftware.au',
      subject: `[#${ticket.ticketNumber}] ${ticket.subject} — ${ticket.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Support Ticket #${ticket.ticketNumber}</h2>
          <p><strong>From:</strong> ${ticket.name} &lt;${ticket.email}&gt;</p>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Category:</strong> ${ticket.category || 'General'}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; white-space: pre-wrap;">${ticket.message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
            Submitted: ${new Date().toLocaleString('en-AU')}
          </p>
        </div>
      `,
    })
    console.log(`[Resend] Admin notified of ticket #${ticket.ticketNumber}`)
  } catch (err) {
    console.error('[Resend] Admin notification failed:', err.message)
  }
}

module.exports = {
  sendUpgradeNotification,
  sendSupportAutoReply,
  sendSupportAdminNotification,
  sendEmailVerification,
  sendPasswordReset,
}

async function sendPasswordReset(to, name, token) {
  const url = `${process.env.DASHBOARD_URL}/reset-password?token=${token}`
  try {
    await client.emails.send({
      from:    'Clarity Fleet <noreply@clarity-software.com.au>',
      to,
      subject: 'Reset your Clarity Fleet password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Clarity Fleet</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click below to set a new one.</p>
          <div style="margin: 32px 0;">
            <a href="${url}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Reset my password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          <p style="color: #6b7280; font-size: 12px;">Or copy this link: ${url}</p>
        </div>
      `,
    })
    console.log(`[Resend] Password reset email sent to ${to}`)
  } catch (err) {
    console.error('[Resend] Password reset email failed:', err.message)
  }
}




async function sendEmailVerification(to, name, token) {
  const url = `${process.env.DASHBOARD_URL}/verify-email?token=${token}`
  try {
    await client.emails.send({
      from:    'Clarity Fleet <noreply@clarity-software.com.au>',
      to,
      subject: 'Verify your Clarity Fleet account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Clarity Fleet</h2>
          <p>Hi ${name},</p>
          <p>Thanks for signing up. Click the button below to verify your email address and activate your account.</p>
          <div style="margin: 32px 0;">
            <a href="${url}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Verify my email
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This link expires in 24 hours. If you did not sign up for Clarity Fleet, ignore this email.</p>
          <p style="color: #6b7280; font-size: 12px;">Or copy this link: ${url}</p>
        </div>
      `,
    })
    console.log(`[Resend] Verification email sent to ${to}`)
  } catch (err) {
    console.error('[Resend] Verification email failed:', err.message)
  }
}
