// @ts-nocheck — relocated from worker/services/twilio.js, unchanged.
const twilio = require('twilio')

let client = null

function getClient() {
  if (client) return client
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
  return client
}

async function sendSms(to, message) {
  try {
    const result = await getClient().messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to,
    })
    console.log(`[Twilio] SMS sent to ${to}: ${result.sid}`)
    return result
  } catch (err) {
    console.error(`[Twilio] SMS failed to ${to}:`, err.message)
  }
}

async function sendWhatsApp(to, message) {
  try {
    const result = await getClient().messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_FROM_NUMBER}`,
      to:   `whatsapp:${to}`,
    })
    console.log(`[Twilio] WhatsApp sent to ${to}: ${result.sid}`)
    return result
  } catch (err) {
    console.error(`[Twilio] WhatsApp failed to ${to}:`, err.message)
  }
}

export { sendSms, sendWhatsApp }