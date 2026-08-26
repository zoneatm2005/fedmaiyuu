// ==========================================================================
// Vercel Serverless Function: Discord Notification Handler (Webhooks & Embeds)
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
    const { type, enteredPin, attemptCount, timestamp, userAgent, title, date, category, caption, imageUrl } = body;

    // Discord Webhooks (Configurable via Environment Variables or defaults)
    const WRONG_PIN_WEBHOOK = process.env.DISCORD_WRONG_PIN_WEBHOOK ||
      'https://discord.com/api/webhooks/1542139526372270150/s3HQJiI_Zn3xYUi_IznNh23tzl9lWZhKHt9WjW_JSTVYfcmBZdO3r9KKKP9LO7vYanlA';

    const PHOTO_UPLOAD_WEBHOOK = process.env.DISCORD_PHOTO_UPLOAD_WEBHOOK ||
      'https://discord.com/api/webhooks/1542140418924216345/86zGkPkSxNHnlU1UJ0KDhNPzQ51On1zMj2uaRRKRdfhj0jyM9MoIdolz6IlhigzJww8v';

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
    const isoTimestamp = new Date().toISOString();

    let targetWebhook = WRONG_PIN_WEBHOOK;
    let discordPayload = {};

    // 1. Photo Upload Notification
    if (type === 'photo_upload' || (!enteredPin && (title || imageUrl))) {
      targetWebhook = PHOTO_UPLOAD_WEBHOOK;

      const categoryMap = {
        'Cute': 'ช่วงเวลาน่ารัก 🐱',
        'First Date': 'เดตแรก ☕',
        'Trips': 'ทริปเที่ยว ✈️',
        'Anniversary': 'วันครบรอบ 🎉',
        'Birthday': 'วันเกิด 🎂'
      };
      const catLabel = categoryMap[category] || category || 'ความทรงจำ 💕';

      let formattedDate = date || 'ไม่ระบุวันที่';
      if (date && date.includes('-')) {
        const [y, m, d] = date.split('-');
        formattedDate = `${d}/${m}/${y}`;
      }

      const captionText = caption
        ? caption
        : 'บันทึกความทรงจำและช่วงเวลาสุดพิเศษของเราสองคน 💕';

      const embed = {
        author: {
          name: '˚ʚ 💖 NEW MEMORY UNLOCKED ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/833/833472.png'
        },
        title: `📸 ‧₊˚ 「 ${title || 'ความทรงจำของเรา'} 」 ˚₊‧ 💕`,
        description: `> 💌 **บันทึกความรู้สึก:**\n> ❝ *${captionText}* ❞\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        color: 0xFF6584, // Aesthetic Romantic Sweet Pink
        fields: [
          {
            name: '🏷️ **หมวดหมู่**',
            value: `> 🌸 **${catLabel}**`,
            inline: true
          },
          {
            name: '📅 **วันที่ความทรงจำ**',
            value: `> 🗓️ **${formattedDate}**`,
            inline: true
          },
          {
            name: '⏰ **เวลาที่บันทึก**',
            value: `> ⏱️ \`${currentTime}\``,
            inline: true
          },
          {
            name: '📱 **อุปกรณ์ที่อัปโหลด**',
            value: `> ${device}`,
            inline: false
          }
        ],
        footer: {
          text: '🐾 Freshmaiyuu Love Album • บันทึกทุกรอยยิ้มของเราสองคน ( ˘͈ ᵕ ˘͈♡)',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
        },
        timestamp: isoTimestamp
      };

      discordPayload = {
        username: '₊˚ 🎀 FRESHMAIYUU MEMORIES 🎀 ˚₊',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png',
        content: '@everyone 💕 มีการบันทึกความทรงจำใหม่ในเว็บแล้วน้าาา!',
        embeds: [embed]
      };
    } else {
      // 2. Wrong PIN Security Alert
      targetWebhook = WRONG_PIN_WEBHOOK;

      const embed = {
        author: {
          name: '˚ʚ 🚨 Intruder Alert • ใครแอบปลดล็อค ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
        },
        title: '🔒 ‧₊˚ มีคนพยายามปลดล็อกเว็บความทรงจำ! ˚₊‧',
        description: `> ⚠️ **สถานะ:** ใส่รหัส PIN ไม่ถูกต้อง!\n> 🥺 *มีคนแอบกด หรือแฟนจำรหัสวันสำคัญไม่ได้น้าาา? ( > ⤙ < )*\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        color: 0xFF3366, // Cute Berry Pink-Red
        fields: [
          {
            name: '🔢 **รหัสที่แอบกด**',
            value: `> 🔒 ||\` ${enteredPin || 'ไม่ระบุ'} \`|| *(กดเพื่อดู)*`,
            inline: true
          },
          {
            name: '⚠️ **แอบกดผิดรอบที่**',
            value: `> 💢 **รอบที่ ${attemptCount || 1}**`,
            inline: true
          },
          {
            name: '⏰ **เวลาที่ตรวจพบ**',
            value: `> ⏱️ \`${currentTime}\``,
            inline: true
          },
          {
            name: '📱 **อุปกรณ์ที่ตรวจพบ**',
            value: `> ${device}`,
            inline: false
          }
        ],
        footer: {
          text: '🔍 Love Security Radar • จับตาดูอยู่นะคะ ( •̀ - •́ )',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/1022/1022382.png'
        },
        timestamp: isoTimestamp
      };

      discordPayload = {
        username: '₊˚ 🚨 Love Security Radar 🚨 ˚₊',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/9373/9373977.png',
        content: '@everyone 🚨 แจ้งเตือนความปลอดภัย: มีคนพยายามปลดล็อกเว็บ!',
        embeds: [embed]
      };
    }

    // Send to Discord Webhook
    const response = await fetch(targetWebhook, {
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

    return res.status(200).json({ success: true, message: 'Discord notification sent successfully' });
  } catch (error) {
    console.error('Handler Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
