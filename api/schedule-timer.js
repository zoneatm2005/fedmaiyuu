// ==========================================================================
// Vercel Serverless Function: Cloud Timer Scheduler (Upstash QStash)
// Schedules exact-second delayed Discord Webhook alerts on the Cloud!
// ==========================================================================

const QSTASH_URL = process.env.QSTASH_URL || 'https://qstash-eu-central-1.upstash.io';
const QSTASH_TOKEN =
  process.env.QSTASH_TOKEN ||
  'eyJVc2VySUQiOiJiYTc2NWUzMS1kNDY1LTQ1OTgtOTNhZC1jZTJmZDY4ZTY2YWIiLCJQYXNzd29yZCI6IjllOTM3YWVhMzcwZjRhMzZiMjA0MDVjNzI0YjhkM2I1In0=';

const DISCORD_TIMER_WEBHOOK =
  process.env.DISCORD_TIMER_WEBHOOK ||
  'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

export default async function handler(req, res) {
  // CORS Headers
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

  try {
    const { action, totalSeconds, message, mentionTarget, startTimeStr, endTimeStr, messageId } = req.body || {};

    // 1. CANCEL SCHEDULED TIMER IN QSTASH
    if (action === 'cancel') {
      if (!messageId) {
        return res.status(200).json({ success: true, message: 'No messageId to cancel' });
      }

      try {
        await fetch(`${QSTASH_URL}/v2/messages/${encodeURIComponent(messageId)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${QSTASH_TOKEN}`
          }
        });
      } catch (err) {
        console.warn('QStash cancel warning:', err);
      }

      return res.status(200).json({ success: true, cancelled: true });
    }

    // 2. SCHEDULE NEW DELAYED TIMER IN QSTASH
    const delaySecs = Math.max(1, parseInt(totalSeconds, 10) || 1);

    let mentionText = '';
    let mentionLabel = '🔕 ไม่ได้แท็กใคร';

    if (mentionTarget === 'fresh' || mentionTarget === '1198602938109657199') {
      mentionText = '<@1198602938109657199>';
      mentionLabel = '💖 เฟรช (<@1198602938109657199>)';
    } else if (mentionTarget === 'best' || mentionTarget === '604625807687680020') {
      mentionText = '<@604625807687680020>';
      mentionLabel = '🐱 เบส (<@604625807687680020>)';
    } else if (mentionTarget === 'both' || mentionTarget === 'everyone' || mentionTarget === '@everyone') {
      mentionText = '@everyone';
      mentionLabel = '👥 ทั้งคู่ (@everyone)';
    }

    // Format human-readable duration
    const hrs = Math.floor(delaySecs / 3600);
    const mins = Math.floor((delaySecs % 3600) / 60);
    const secs = delaySecs % 60;
    const durParts = [];
    if (hrs > 0) durParts.push(`${hrs} ชั่วโมง`);
    if (mins > 0) durParts.push(`${mins} นาที`);
    if (secs > 0 || durParts.length === 0) durParts.push(`${secs} วินาที`);
    const durationLabel = durParts.join(' ');

    const embed = {
      author: {
        name: '˚ʚ ⏰ Freshmaiyuu Cloud Timer ɞ˚',
        icon_url: 'https://cdn-icons-png.flaticon.com/512/3669/3669986.png'
      },
      title: '⏰ ‧₊˚ หมดเวลาจับเวลาแล้วน้าาา! ˚₊‧ 💕',
      description: `> 💌 **ข้อความเตือนความจำ:**\n> ❝ *${message || 'ครบเวลาที่ตั้งไว้แล้วค่ะ!'}* ❞\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
      color: 0xFF6584,
      fields: [
        {
          name: '⏱️ **ระยะเวลาที่จับ**',
          value: `> ⏳ **${durationLabel}**`,
          inline: true
        },
        {
          name: '👤 **แจ้งเตือนถึง**',
          value: `> ${mentionLabel}`,
          inline: true
        },
        {
          name: '⏰ **เวลาที่เริ่มจับ**',
          value: `> 🕒 \`${startTimeStr || 'ไม่ระบุ'}\``,
          inline: false
        },
        {
          name: '🔔 **เวลาที่ครบกำหนด**',
          value: `> ✨ \`${endTimeStr || 'ครบกำหนด'}\``,
          inline: false
        },
        {
          name: '☁️ **ระบบส่งแจ้งเตือน**',
          value: `> 🌐 Upstash Cloud Queue (แจ้งเตือนตรงเวลาเป๊ะ แม้ปิดเว็บ/ปิดเครื่อง)`,
          inline: true
        }
      ],
      footer: {
        text: '🐾 Freshmaiyuu • Timer & Reminder System 💕',
        icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
      },
      timestamp: new Date().toISOString()
    };

    const discordPayload = {
      username: '₊˚ ⏱️ แจ้งเตือนจับเวลา (Freshmaiyuu) ⏱️ ˚₊',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3669/3669986.png',
      content: mentionText ? `${mentionText} ⏰ มีการแจ้งเตือนจับเวลาครบกำหนดแล้วน้าาา!` : '⏰ ครบกำหนดเวลาจับเวลาแล้วน้าาา!',
      embeds: [embed]
    };

    // Publish to QStash targeting the Discord Webhook directly with Upstash-Delay header!
    const qstashEndpoint = `${QSTASH_URL}/v2/publish/${DISCORD_TIMER_WEBHOOK}`;

    const qstashRes = await fetch(qstashEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Delay': `${delaySecs}s`,
        'Upstash-Retries': '3'
      },
      body: JSON.stringify(discordPayload)
    });

    if (!qstashRes.ok) {
      const errText = await qstashRes.text();
      console.error('QStash publish error:', errText);
      return res.status(500).json({ success: false, error: 'QStash error: ' + errText });
    }

    const qstashResult = await qstashRes.json();

    return res.status(200).json({
      success: true,
      messageId: qstashResult.messageId,
      delaySecs: delaySecs,
      targetTime: endTimeStr
    });
  } catch (error) {
    console.error('Schedule Timer Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
