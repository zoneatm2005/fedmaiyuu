// ==========================================================================
// Vercel Serverless Function: Timer & Reminder Discord Notification Handler
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
    const {
      message = 'ครบเวลาที่ตั้งไว้แล้วค่ะ! 💕',
      mentionTarget = 'none',
      durationLabel = 'ไม่ระบุระยะเวลา',
      startTime = '',
      endTime = '',
      userAgent = '',
      presetName = ''
    } = body;

    const TIMER_WEBHOOK_URL =
      process.env.DISCORD_TIMER_WEBHOOK ||
      'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

    // Parse Device Info
    let device = '🌐 อุปกรณ์ทั่วไป';
    if (userAgent) {
      if (/iPhone/i.test(userAgent)) device = '📱 iPhone (iOS)';
      else if (/iPad/i.test(userAgent)) device = '📱 iPad (iPadOS)';
      else if (/Android/i.test(userAgent)) device = '📱 โทรศัพท์ Android';
      else if (/Windows NT/i.test(userAgent)) device = '💻 คอมพิวเตอร์ Windows';
      else if (/Macintosh/i.test(userAgent)) device = '💻 เครื่อง Mac';
    }

    // Determine Mention Text & Label
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
    } else if (mentionTarget && mentionTarget !== 'none') {
      mentionText = mentionTarget.startsWith('<@') ? mentionTarget : `<@${mentionTarget}>`;
      mentionLabel = `👤 ${mentionText}`;
    }

    const currentFormattedTime = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const displayStart = startTime || currentFormattedTime;
    const displayEnd = endTime || currentFormattedTime;

    let finalDurationLabel = durationLabel;
    if ((!finalDurationLabel || finalDurationLabel === 'ไม่ระบุระยะเวลา') && body.totalSeconds > 0) {
      const s = Math.max(0, Math.floor(body.totalSeconds));
      const hrs = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = s % 60;
      const parts = [];
      if (hrs > 0) parts.push(`${hrs} ชั่วโมง`);
      if (mins > 0) parts.push(`${mins} นาที`);
      if (secs > 0 || parts.length === 0) parts.push(`${secs} วินาที`);
      finalDurationLabel = parts.join(' ');
    }

    const embed = {
      title: '⏰ ‧₊˚ ถึงเวลาที่ตั้งไว้แล้วนะคะ! ˚₊‧ 💕',
      description: `# 💌 ${message || 'ครบเวลาที่ตั้งไว้แล้วค่ะ!'}`,
      color: 0xF472B6,
      thumbnail: {
        url: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png'
      },
      footer: {
        text: `⏳ ครบเวลา ${finalDurationLabel} • Freshmaiyuu 💕`,
        icon_url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png'
      },
      timestamp: new Date().toISOString()
    };

    const discordPayload = {
      username: '˚ʚ 💌 แจ้งเตือนจับเวลา (Freshmaiyuu) ɞ˚',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/9908/9908332.png',
      content: mentionText ? `${mentionText} ⏰ **${message || 'ถึงเวลาที่ตั้งไว้แล้วค่ะ!'}**` : `⏰ **${message || 'ถึงเวลาที่ตั้งไว้แล้วค่ะ!'}**`,
      embeds: [embed]
    };

    const response = await fetch(TIMER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discordPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord Timer Webhook Error:', response.status, errorText);
      return res.status(response.status).json({ success: false, error: errorText });
    }

    return res.status(200).json({
      success: true,
      message: 'ส่งแจ้งเตือนจับเวลาเข้า Discord สำเร็จแล้ว!',
      timestamp: displayEnd,
      target: mentionLabel
    });
  } catch (error) {
    console.error('Timer Alert Handler Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
