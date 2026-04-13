const https = require('https');

/**
 * Sends a web push notification via the OneSignal REST API.
 * @param {string[]} playerIds - Array of OneSignal player IDs (subscription IDs).
 * @param {string} heading - Notification title.
 * @param {string} message - Notification body.
 */
async function sendPushNotification(playerIds, heading, message) {
  if (!playerIds || playerIds.length === 0) return;

  const appId = process.env.ONE_SIGNAL_APP_ID;
  const apiKey = process.env.ONE_SIGNAL_API_KEY;

  if (!appId || !apiKey) {
    console.warn('OneSignal env variables missing, skipping push notification.');
    return;
  }

  const payload = JSON.stringify({
    app_id: appId,
    include_subscription_ids: playerIds,
    headings: { en: heading },
    contents: { en: message }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.onesignal.com',
      path: '/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            console.error('OneSignal error:', parsed.errors);
          }
          resolve(parsed);
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      console.error('OneSignal request failed:', err.message);
      resolve(null); // fail silently so app doesn't crash
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendPushNotification };
