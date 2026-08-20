// ==========================================================================
// Vercel Serverless Function: LINE Webhook Handler
// ==========================================================================

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle LINE Webhook verification test (GET/POST with empty events)
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'LINE Webhook is Active!' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const LINE_ACCESS_TOKEN = 'tWGQCCCWRIwj0Smn3lQ+rDiTsUWTZlDQIUzOf/dyTy81ZNs64VUp0fMopL028phhbariWKa+AUbhQOIJTA7mwvT3S/nxY/tVsHdtiqwCsg60myXMUF71bC3DR0FAiuEeeEKof3COs2lwJf/OVeYyOQdB04t89/1O/w1cDnyilFU=';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const events = body.events || [];

    for (const event of events) {
      const replyToken = event.replyToken;
      const source = event.source || {};
      const groupId = source.groupId || source.roomId;

      // 1. Event: Bot joins a group or room
      if (event.type === 'join') {
        if (replyToken && groupId) {
          await sendReply(replyToken, [
            {
              type: 'text',
              text: `👋 สวัสดีค่า! บอท Love Alert เข้าร่วมกลุ่มแล้วนะคะ 💖\n\n📌 Group ID ของกลุ่มนี้คือ:\n${groupId}\n\n(ก๊อปปี้รหัสนี้ไปใส่ในเว็บเพื่อรับแจ้งเตือนความปลอดภัยได้เลยค่ะ!)`
            }
          ], LINE_ACCESS_TOKEN);
        }
      }

      // 2. Event: Message sent in group
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        const text = (event.message.text || '').trim().toLowerCase();

        // If someone asks for ID, group, help, or says hi
        if (text === 'id' || text === 'group id' || text === 'ขอรหัสกลุ่ม' || text === 'รหัสกลุ่ม' || text === 'test' || text === 'ทดสอบ') {
          if (replyToken) {
            const replyMsg = groupId 
              ? `💖 Group ID ของกลุ่มนี้คือ:\n${groupId}\n\n(ก๊อปปี้รหัสนี้ส่งมาตั้งค่าแจ้งเตือนได้เลยค่ะ)`
              : `👤 User ID ของคุณคือ:\n${source.userId}`;

            await sendReply(replyToken, [{ type: 'text', text: replyMsg }], LINE_ACCESS_TOKEN);
          }
        }
      }
    }

    return res.status(200).json({ success: true, count: events.length });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
}

// Helper: Send reply to LINE
async function sendReply(replyToken, messages, token) {
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: messages
      })
    });
  } catch (e) {
    console.error('sendReply error:', e);
  }
}
