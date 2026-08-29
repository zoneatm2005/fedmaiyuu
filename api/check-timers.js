// ==========================================================================
// Vercel Serverless Function & Cron: Cloud Background Timer Checker
// Runs periodically in the cloud to send Discord alert even if web is closed!
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

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vqawcettdkjbhmxevyuk.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FKlGbWAjQ5o-FoJT029OHQ_Gi2GC_D3';
  const TIMER_WEBHOOK_URL =
    process.env.DISCORD_TIMER_WEBHOOK ||
    'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

  try {
    // 1. Fetch current shared data from Supabase
    const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/love_data?id=eq.shared_app_data`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!fetchRes.ok) {
      const err = await fetchRes.text();
      return res.status(fetchRes.status).json({ success: false, error: 'Supabase fetch error: ' + err });
    }

    const rows = await fetchRes.json();
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].data) {
      return res.status(200).json({ success: true, message: 'No app data found' });
    }

    const fullData = rows[0].data;
    const activeTimer = fullData.activeTimer;

    if (!activeTimer) {
      return res.status(200).json({ success: true, message: 'No active timer in cloud' });
    }

    const now = Date.now();

    // Check if timer is running and time has elapsed and not yet sent
    if (!activeTimer.isSent && !activeTimer.isPaused && activeTimer.targetEndTime && now >= activeTimer.targetEndTime) {
      // 2. Prepare Discord Mention & Payload
      let mentionText = '';
      let mentionLabel = '🔕 ไม่ได้แท็กใคร';

      if (activeTimer.mentionTarget === 'fresh' || activeTimer.mentionTarget === '1198602938109657199') {
        mentionText = '<@1198602938109657199>';
        mentionLabel = '💖 เฟรช (<@1198602938109657199>)';
      } else if (activeTimer.mentionTarget === 'best' || activeTimer.mentionTarget === '604625807687680020') {
        mentionText = '<@604625807687680020>';
        mentionLabel = '🐱 เบส (<@604625807687680020>)';
      } else if (activeTimer.mentionTarget === 'both' || activeTimer.mentionTarget === 'everyone' || activeTimer.mentionTarget === '@everyone') {
        mentionText = '@everyone';
        mentionLabel = '👥 ทั้งคู่ (@everyone)';
      }

      // Format duration
      const totalSecs = activeTimer.totalSeconds || 0;
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      const durParts = [];
      if (hrs > 0) durParts.push(`${hrs} ชั่วโมง`);
      if (mins > 0) durParts.push(`${mins} นาที`);
      if (secs > 0 || durParts.length === 0) durParts.push(`${secs} วินาที`);
      const durationLabel = durParts.join(' ');

      const embed = {
        title: '⏰ ‧₊˚ ถึงเวลาที่ตั้งไว้แล้วนะคะ! ˚₊‧ 💕',
        description: `# 💌 ${activeTimer.message || 'ครบเวลาที่ตั้งไว้แล้วค่ะ!'}`,
        color: 0xF472B6,
        thumbnail: {
          url: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png'
        },
        footer: {
          text: `⏳ ครบเวลา ${durationLabel} • Freshmaiyuu 💕`,
          icon_url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png'
        },
        timestamp: new Date().toISOString()
      };

      const discordPayload = {
        username: '˚ʚ 💌 แจ้งเตือนจับเวลา (Freshmaiyuu) ɞ˚',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/9908/9908332.png',
        content: mentionText ? `${mentionText} ⏰ **${activeTimer.message || 'ถึงเวลาที่ตั้งไว้แล้วค่ะ!'}**` : `⏰ **${activeTimer.message || 'ถึงเวลาที่ตั้งไว้แล้วค่ะ!'}**`,
        embeds: [embed]
      };

      // Send to Discord
      await fetch(TIMER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });

      // 3. Mark as sent in Supabase to prevent duplicate sends
      activeTimer.isSent = true;
      fullData.activeTimer = activeTimer;

      await fetch(`${SUPABASE_URL}/rest/v1/love_data?id=eq.shared_app_data`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          data: fullData,
          updated_at: new Date().toISOString()
        })
      });

      return res.status(200).json({
        success: true,
        alerted: true,
        message: activeTimer.message,
        target: mentionLabel
      });
    }

    return res.status(200).json({
      success: true,
      alerted: false,
      isSent: activeTimer.isSent,
      remainingMs: Math.max(0, (activeTimer.targetEndTime || 0) - now)
    });
  } catch (error) {
    console.error('Check Timers Cron Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
