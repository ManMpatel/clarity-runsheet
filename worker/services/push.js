async function sendPush(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return

  const messages = tokens
    .filter(t => t && t.startsWith('ExponentPushToken'))
    .map(to => ({ to, title, body, data, sound: 'default' }))

  if (messages.length === 0) return

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(messages),
    })
  } catch (err) {
    console.error('[Push] Send error:', err.message)
  }
}

module.exports = { sendPush }