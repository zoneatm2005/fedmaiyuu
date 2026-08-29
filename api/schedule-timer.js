// ==========================================================================
// Vercel Serverless Function: Cloud Timer Scheduler (Upstash QStash + Supabase Verification)
// Prevents old timer alerts when time is added (+1m/+5m) or timer is cancelled/paused!
// ==========================================================================

const QSTASH_URL = process.env.QSTASH_URL || 'https://qstash-eu-central-1.upstash.io';
const QSTASH_TOKEN =
  process.env.QSTASH_TOKEN ||
  'eyJVc2VySUQiOiJiYTc2NWUzMS1kNDY1LTQ1OTgtOTNhZC1jZTJmZDY4ZTY2YWIiLCJQYXNzd29yZCI6IjllOTM3YWVhMzcwZjRhMzZiMjA0MDVjNzI0YjhkM2I1In0=';

const DISCORD_TIMER_WEBHOOK =
  process.env.DISCORD_TIMER_WEBHOOK ||
  'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vqawcettdkjbhmxevyuk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FKlGbWAjQ5o-FoJT029OHQ_Gi2GC_D3';

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
    const {
      action,
      totalSeconds,
      message,
      mentionTarget,
      startTimeStr,
      endTimeStr,
      timerToken,
      presetName,
      messageId
    } = req.body || {};

    // --------------------------------------------------------------------------
    // 1. CANCEL SCHEDULED TIMER IN QSTASH
    // --------------------------------------------------------------------------
    if (action === 'cancel') {
      if (messageId) {
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
      }

      return res.status(200).json({ success: true, cancelled: true });
    }

    // --------------------------------------------------------------------------
    // 2. EXECUTE DELAYED NOTIFICATION (Called by QStash when timer expires)
    // --------------------------------------------------------------------------
    if (action === 'execute') {
      // Query Supabase to verify if this timer is STILL active and NOT replaced/cancelled/paused!
      try {
        const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/love_data?id=eq.shared_app_data`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (fetchRes.ok) {
          const rows = await fetchRes.json();
          let currentData = {};
          if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            currentData = rows[0].data;
          }

          const activeTimer = currentData.activeTimer;

          // Check A: Has the timer been cancelled?
          if (!activeTimer) {
            console.log('Timer was cancelled by user. Discarding alert.');
            return res.status(200).json({ success: true, discarded: 'Timer cancelled by user' });
          }

          // Check B: Has the timer been extended/replaced (+1m, +5m)? (Tokens must match!)
          if (timerToken && activeTimer.timerToken && activeTimer.timerToken !== timerToken) {
            console.log(`Timer was extended/replaced (active token: ${activeTimer.timerToken}, expired token: ${timerToken}). Discarding old alert.`);
            return res.status(200).json({ success: true, discarded: 'Replaced by newer timer extension' });
          }

          // Check C: Is the timer paused?
          if (activeTimer.isPaused) {
            console.log('Timer is currently paused. Discarding alert.');
            return res.status(200).json({ success: true, discarded: 'Timer is currently paused' });
          }

          // Check D: Was it already sent?
          if (activeTimer.isSent) {
            console.log('Timer already sent. Discarding.');
            return res.status(200).json({ success: true, discarded: 'Already sent' });
          }

          // Mark as sent in Supabase to prevent duplicate execution
          activeTimer.isSent = true;
          currentData.activeTimer = activeTimer;

          await fetch(`${SUPABASE_URL}/rest/v1/love_data?id=eq.shared_app_data`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              data: currentData,
              updated_at: new Date().toISOString()
            })
          });
        }
      } catch (err) {
        console.warn('Supabase verification error:', err);
      }

      // If verification passed, send the Discord alert!
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

      const delaySecs = Math.max(1, parseInt(totalSeconds, 10) || 1);
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
            value: `> ⏳ **${durationLabel}**${presetName ? ` (${presetName})` : ''}`,
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

      const discordRes = await fetch(DISCORD_TIMER_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });

      if (!discordRes.ok) {
        const errText = await discordRes.text();
        console.error('Discord Webhook send error:', errText);
        return res.status(500).json({ success: false, error: errText });
      }

      return res.status(200).json({ success: true, sent: true });
    }

    // --------------------------------------------------------------------------
    // 3. SCHEDULE NEW DELAYED TIMER (Dispatched to QStash)
    // --------------------------------------------------------------------------
    const delaySecs = Math.max(1, parseInt(totalSeconds, 10) || 1);
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'fedmaiyuu.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const callbackEndpoint = `${protocol}://${host}/api/schedule-timer`;

    const qstashPayload = {
      action: 'execute',
      timerToken: timerToken || 'tok_' + Date.now(),
      totalSeconds: delaySecs,
      message: message || 'ครบเวลาที่ตั้งไว้แล้วค่ะ! 💕',
      mentionTarget: mentionTarget || 'none',
      startTimeStr: startTimeStr || '',
      endTimeStr: endTimeStr || '',
      presetName: presetName || ''
    };

    const qstashEndpoint = `${QSTASH_URL}/v2/publish/${callbackEndpoint}`;

    const qstashRes = await fetch(qstashEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Delay': `${delaySecs}s`,
        'Upstash-Retries': '3'
      },
      body: JSON.stringify(qstashPayload)
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
      timerToken: qstashPayload.timerToken,
      targetTime: endTimeStr
    });
  } catch (error) {
    console.error('Schedule Timer Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
