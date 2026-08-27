// ==========================================================================
// Vercel Serverless & Cron Function: Nightly Reminder for Discord
// Scheduled: Every day at 21:00 (GMT+7 Bangkok Time) / 14:00 UTC
// ==========================================================================

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Allow both GET (for Vercel Cron or direct browser test) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const DISCORD_WEBHOOK_URL =
      process.env.DISCORD_NIGHTLY_REMINDER_WEBHOOK ||
      'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

    const targetUserId = process.env.DISCORD_TARGET_USER_ID || '1198602938109657199';
    const mentionText = targetUserId.startsWith('<@') ? targetUserId : `<@${targetUserId}>`;
    const currentTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const isoTimestamp = new Date().toISOString();

    const embed = {
      author: {
        name: '˚ʚ Safety Reminder ɞ˚',
        icon_url: 'https://cdn-icons-png.flaticon.com/512/3669/3669986.png'
      },
      title: '🚪🔒 ‧₊˚ เตือนความจำก่อนเข้านอน ˚₊‧ 💕',
      color: 10180790, // 0x9B59B6
      fields: [
        {
          name: '🛡️ **สิ่งที่ต้องเช็ค**',
          value: '> 🚪 ล็อคประตูด้านใน\n> 🪟 เช็คหน้าต่าง\n> 🔌 ถอดปลั๊กไฟ',
          inline: true
        },
        {
          name: '💖 **ความห่วงใย**',
          value: '> อย่าลืมนะคะที่รัก 🌙💤\n> จาก <@604625807687680020> เป็นห่วงและคิดถึงเสมอนะคะ ( ˘͈ ᵕ ˘͈♡)',
          inline: false
        }
      ],
      footer: {
        text: '🐾 Freshmaiyuu • Good Night 🌙💤',
        icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
      },
      timestamp: isoTimestamp
    };

    const discordPayload = {
      username: '₊˚ 🌙 แจ้งเตือน 3 ทุ่ม 🌙 ˚₊',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3669/3669986.png',
      content: `${mentionText} <@604625807687680020>`,
      embeds: [embed]
    };

    // Send to Discord Webhook
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discordPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord Webhook Error:', response.status, errorText);
      return res.status(response.status).json({ success: false, error: errorText });
    }

    return res.status(200).json({
      success: true,
      message: 'ส่งแจ้งเตือนเตือนล็อคห้องเข้า Discord สำเร็จแล้ว!',
      timestamp: currentTime,
      target: mentionText
    });
  } catch (error) {
    console.error('Nightly Reminder Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
