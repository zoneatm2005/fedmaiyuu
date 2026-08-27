// ==========================================================================
// Vercel Serverless & Cron Function: Special Day Reminder (Anniversary & Birthday)
// Scheduled: Every day at 00:00 (GMT+7 Bangkok Time) / 17:00 UTC
// Webhook: https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST
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
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const DISCORD_WEBHOOK_URL =
      process.env.DISCORD_SPECIAL_DAY_WEBHOOK ||
      'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

    const targetUserId1 = process.env.DISCORD_TARGET_USER_ID_1 || '1198602938109657199';
    const targetUserId2 = process.env.DISCORD_TARGET_USER_ID_2 || '604625807687680020';

    const mention1 = targetUserId1.startsWith('<@') ? targetUserId1 : `<@${targetUserId1}>`;
    const mention2 = targetUserId2.startsWith('<@') ? targetUserId2 : `<@${targetUserId2}>`;
    const mentions = `${mention1} ${mention2}`;

    // Get current Bangkok time & date
    const bkkFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    const parts = bkkFormatter.formatToParts(new Date());
    const dateMap = {};
    parts.forEach(p => { dateMap[p.type] = p.value; });

    const currentYear = parseInt(dateMap.year, 10);
    const currentMonth = parseInt(dateMap.month, 10);
    const currentDay = parseInt(dateMap.day, 10);

    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(currentDay)}`;
    const monthDayStr = `${pad(currentMonth)}-${pad(currentDay)}`;

    const currentTimeTh = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const isoTimestamp = new Date().toISOString();

    // Check request query / body for testing or manual triggers
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const testMode = url.searchParams.get('test') || (req.body && req.body.test);
    const forceSend = url.searchParams.get('force') === 'true' || (req.body && req.body.force === true);
    const customGreeting = req.body && req.body.greeting;

    // Love calculation from start date: 2026-08-02
    const startDate = new Date('2026-08-02T00:00:00+07:00');
    const nowBkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const diffMs = nowBkk - startDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let daysTogetherText = '';
    if (diffDays >= 0) {
      daysTogetherText = `คบกันมาแล้ว ${diffDays + 1} วัน 💕`;
    } else {
      daysTogetherText = `เริ่มต้นความรัก 2 ส.ค. 2026 💕`;
    }

    // Default Greetings Map
    const DEFAULT_GREETINGS = {
      'birthday-moo': 'สุขสันต์วันเกิดนะหมูที่รัก! 🐷💖 ขอให้มีความสุขมากๆ สุขภาพแข็งแรง น่ารักแบบนี้ตลอดไปนะคะ ✨',
      'birthday-auan': 'สุขสันต์วันเกิดนะอ้วนที่รัก! 🐻💖 ขอให้มีความสุขมากๆ รวยๆ เฮงๆ ยิ้มเยอะๆ ในทุกๆ วันนะคะ ✨',
      'anniversary-monthly': 'สุขสันต์วันครบรอบนะที่รัก 💕 ขอบคุณที่อยู่เคียงข้างและสร้างความทรงจำดีๆ ร่วมกันเสมอมานะคะ ( ˘͈ ᵕ ˘͈♡)',
      'anniversary-yearly': '🎉 วันนี้วันครบรอบใหญ่ประจำปีของเรา สุขสันต์วันครบรอบนะคะ ขอบคุณที่รักกันตลอดมานะ ( ˘͈ ᵕ ˘͈♡)'
    };

    // Determine Event Type
    let eventType = null;

    if (testMode) {
      if (testMode === 'birthday-moo' || testMode === 'moo') {
        eventType = 'birthday-moo';
      } else if (testMode === 'birthday-auan' || testMode === 'auan') {
        eventType = 'birthday-auan';
      } else if (testMode === 'anniversary-yearly' || testMode === 'yearly') {
        eventType = 'anniversary-yearly';
      } else {
        eventType = 'anniversary-monthly';
      }
    } else {
      // Real Date Match
      if (monthDayStr === '04-28') {
        eventType = 'birthday-moo';
      } else if (monthDayStr === '05-06') {
        eventType = 'birthday-auan';
      } else if (currentDay === 2) {
        eventType = (currentMonth === 8) ? 'anniversary-yearly' : 'anniversary-monthly';
      }
    }

    // If not a special day and not force mode, exit safely without sending to Discord
    if (!eventType && !forceSend) {
      return res.status(200).json({
        success: true,
        isSpecialDay: false,
        message: 'วันนี้ไม่ใช่วันครบรอบหรือวันเกิด (ไม่ได้ส่งแจ้งเตือน Discord)',
        today: todayStr,
        currentTime: currentTimeTh
      });
    }

    if (!eventType && forceSend) {
      eventType = 'anniversary-monthly';
    }

    // Build Specific Event Embeds
    let embed = {};

    if (eventType === 'birthday-moo') {
      const greeting = customGreeting || DEFAULT_GREETINGS['birthday-moo'];
      embed = {
        author: {
          name: '˚ʚ 🎂 HAPPY BIRTHDAY TO MOO ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/3159/3159066.png'
        },
        title: '🎉 ‧₊˚ สุขสันต์วันเกิดนะหมูที่รัก! 🐷🎂 ˚₊‧ 💕',
        description: `> 💌 **คำอวยพรสุดพิเศษ:**\n> ❝ *${greeting}* ❞\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        color: 0xFF758C, // Pastel Peachy Pink
        fields: [
          {
            name: '👑 **เจ้าของวันเกิดวันนี้**',
            value: '> 🐷 **หมู (Moo)** 💖',
            inline: true
          },
          {
            name: '📅 **วันที่พิเศษ**',
            value: '> 🗓️ **28 เมษายน**',
            inline: true
          },
          {
            name: '⏰ **เวลาที่แจ้งเตือน**',
            value: `> ⏱️ \`${currentTimeTh}\``,
            inline: false
          },
          {
            name: '✨ **ความในใจจากแฟน**',
            value: `> ขอให้หมูมีรอยยิ้มที่สดใสในทุกๆ วัน เป็นที่รักและมีความสุขที่สุดในโลกนะ! 🎂✨`,
            inline: false
          }
        ],
        footer: {
          text: '🐾 Freshmaiyuu Birthday Celebration • รักหมูที่สุดในโลก ( ˘͈ ᵕ ˘͈♡)',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
        },
        timestamp: isoTimestamp
      };
    } else if (eventType === 'birthday-auan') {
      const greeting = customGreeting || DEFAULT_GREETINGS['birthday-auan'];
      embed = {
        author: {
          name: '˚ʚ 🎂 HAPPY BIRTHDAY TO AUAN ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/3069/3069172.png'
        },
        title: '🎉 ‧₊˚ สุขสันต์วันเกิดนะอ้วนที่รัก! 🐻🎂 ˚₊‧ 💕',
        description: `> 💌 **คำอวยพรสุดพิเศษ:**\n> ❝ *${greeting}* ❞\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        color: 0xFFA726, // Warm Honey Amber / Gold
        fields: [
          {
            name: '👑 **เจ้าของวันเกิดวันนี้**',
            value: '> 🐻 **อ้วน (Auan)** 💖',
            inline: true
          },
          {
            name: '📅 **วันที่พิเศษ**',
            value: '> 🗓️ **6 พฤษภาคม**',
            inline: true
          },
          {
            name: '⏰ **เวลาที่แจ้งเตือน**',
            value: `> ⏱️ \`${currentTimeTh}\``,
            inline: false
          },
          {
            name: '✨ **ความในใจจากแฟน**',
            value: `> ขอให้อ้วนมีความสุขมากๆ คิดสิ่งใดสมหวัง สุขภาพแข็งแรง รวยๆ เฮงๆ น้าาา! 🎂✨`,
            inline: false
          }
        ],
        footer: {
          text: '🐾 Freshmaiyuu Birthday Celebration • รักอ้วนที่สุดในโลก ( ˘͈ ᵕ ˘͈♡)',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
        },
        timestamp: isoTimestamp
      };
    } else if (eventType === 'anniversary-yearly') {
      const greeting = customGreeting || DEFAULT_GREETINGS['anniversary-yearly'];
      embed = {
        author: {
          name: '˚ʚ 💍 ANNUAL ANNIVERSARY CELEBRATION ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/833/833472.png'
        },
        title: '🎉 ‧₊˚ สุขสันต์วันครบรอบใหญ่ประจำปีของเรา! 💍🥂 ˚₊‧ 💕',
        description: `> 💌 **บันทึกความรู้สึก:**\n> ❝ *${greeting}* ❞\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        color: 0xFF2D55, // Deep Radiant Rose Red/Pink
        fields: [
          {
            name: '💖 **วันครบรอบใหญ่**',
            value: '> 🥂 **2 สิงหาคม (02/08)**',
            inline: true
          },
          {
            name: '⏳ **สถานะความรัก**',
            value: `> 🌸 **${daysTogetherText}**`,
            inline: true
          },
          {
            name: '⏰ **เวลาที่แจ้งเตือน**',
            value: `> ⏱️ \`${currentTimeTh}\``,
            inline: false
          },
          {
            name: '💌 **ข้อความจากหัวใจ**',
            value: `> ขอบคุณทุกการเดินทางและทุกรอยยิ้มที่มอบให้กัน จะรักและดูแลเธอแบบนี้ตลอดไปนะคะ 💖`,
            inline: false
          }
        ],
        footer: {
          text: '🐾 Freshmaiyuu Annual Anniversary • ขอบคุณที่อยู่ข้างกันเสมอนะคะ 💕',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
        },
        timestamp: isoTimestamp
      };
    } else {
      // Monthly Anniversary (Every 2nd of the month)
      const greeting = customGreeting || DEFAULT_GREETINGS['anniversary-monthly'];
      embed = {
        author: {
          name: '˚ʚ 💕 MONTHLY ANNIVERSARY REMINDER ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png'
        },
        title: '💖 ‧₊˚ สุขสันต์วันครบรอบประจำเดือน! (วันที่ 2) ˚₊‧ 💕',
        description: `> 💌 **บันทึกความรู้สึก:**\n> ❝ *${greeting}* ❞\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        color: 0xFF6584, // Cute Sweet Pink
        fields: [
          {
            name: '🗓️ **วันครบรอบรอบนี้**',
            value: `> 🌸 **วันที่ 2 ${new Date().toLocaleString('th-TH', { month: 'long', timeZone: 'Asia/Bangkok' })}**`,
            inline: true
          },
          {
            name: '⏳ **เส้นทางความรัก**',
            value: `> 🐾 **${daysTogetherText}**`,
            inline: true
          },
          {
            name: '⏰ **เวลาที่แจ้งเตือน**',
            value: `> ⏱️ \`${currentTimeTh}\``,
            inline: false
          }
        ],
        footer: {
          text: '🐾 Freshmaiyuu • สุขสันต์วันครบรอบวันที่ 2 ของทุกเดือนนะคะ ( ˘͈ ᵕ ˘͈♡)',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/2107/2107845.png'
        },
        timestamp: isoTimestamp
      };
    }

    const discordPayload = {
      username: '₊˚ 💖 Freshmaiyuu Special Day 💖 ˚₊',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/833/833472.png',
      content: `${mentions} 💕 **วันสำคัญของเรามาถึงแล้วน้าาา!** ✨`,
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
      isSpecialDay: true,
      eventType: eventType,
      message: `ส่งแจ้งเตือน ${embed.title} เข้า Discord สำเร็จเรียบร้อยแล้ว! 💕`,
      today: todayStr,
      timestamp: currentTimeTh
    });
  } catch (error) {
    console.error('Special Day Reminder Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
