// ==========================================================================
// Vercel Serverless Function: LINE Security Alert (Wrong PIN Notification)
// ==========================================================================

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { enteredPin, attemptCount, timestamp, userAgent } = body;

    const LINE_ACCESS_TOKEN = 'tWGQCCCWRIwj0Smn3lQ+rDiTsUWTZlDQIUzOf/dyTy81ZNs64VUp0fMopL028phhbariWKa+AUbhQOIJTA7mwvT3S/nxY/tVsHdtiqwCsg60myXMUF71bC3DR0FAiuEeeEKof3COs2lwJf/OVeYyOQdB04t89/1O/w1cDnyilFU=';
    // Send directly to the Couple's LINE Group
    const LINE_TARGET_ID = 'Cd34a6d262de3438f5a62213ec9a0694c';

    // Parse Device Info
    let device = '🌐 อุปกรณ์ทั่วไป';
    if (userAgent) {
      if (/iPhone/i.test(userAgent)) device = '📱 iPhone (iOS)';
      else if (/iPad/i.test(userAgent)) device = '📱 iPad (iPadOS)';
      else if (/Android/i.test(userAgent)) device = '📱 โทรศัพท์ Android';
      else if (/Windows NT/i.test(userAgent)) device = '💻 คอมพิวเตอร์ Windows';
      else if (/Macintosh/i.test(userAgent)) device = '💻 เครื่อง Mac';
    }

    const currentTime = timestamp || new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // Format Alert Message
    const alertMessage = 
`🚨 [แจ้งเตือนความปลอดภัย] มีคนพยายามปลดล็อกเว็บ!
━━━━━━━━━━━━━━━━━━━━
❌ สถานะ: ใส่รหัส PIN ไม่ถูกต้อง
🔢 รหัสที่ลองกด: ${enteredPin || 'ไม่ระบุ'}
⚠️ ใส่ผิดครั้งที่: ${attemptCount || 1}
⏰ เวลา: ${currentTime}
📱 อุปกรณ์: ${device}
━━━━━━━━━━━━━━━━━━━━
💬 มีคนแอบกด หรือแฟนจำรหัสวันสำคัญไม่ได้นะ? 🥺`;

    // Push Message to LINE Messaging API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_TARGET_ID,
        messages: [
          {
            type: 'text',
            text: alertMessage
          }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('LINE API Error:', data);
      return res.status(response.status).json({ success: false, error: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Handler Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
