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

module.exports = { sendUpgradeNotification }