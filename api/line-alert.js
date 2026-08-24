// ==========================================================================
// Vercel Serverless Function: LINE Notification Handler (Flex Message & Fallback)
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

    let messages = [];
    let fallbackMessages = [];

    // Check if this is a Photo Upload event
    if (type === 'photo_upload' || (!enteredPin && (title || imageUrl))) {
      // Map category to readable Thai label
      const categoryMap = {
        'Cute': 'ช่วงเวลาน่ารัก 🐱',
        'First Date': 'เดตแรก ☕',
        'Trips': 'ทริปเที่ยว ✈️',
        'Anniversary': 'วันครบรอบ 🎉'
      };
      const catLabel = categoryMap[category] || category || 'ความทรงจำ 💕';

      let formattedDate = date || 'ไม่ระบุวันที่';
      if (date && date.includes('-')) {
        const [y, m, d] = date.split('-');
        formattedDate = `${d}/${m}/${y}`;
      }

      // Check if image URL is valid HTTPS (for Flex Hero Image)
      const isHttpsImage = typeof imageUrl === 'string' && imageUrl.startsWith('https://');

      // 1. PRIMARY: Premium LINE Flex Message Card
      const flexBubble = {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FF4770',
          paddingTop: '16px',
          paddingBottom: '16px',
          paddingStart: '20px',
          paddingEnd: '20px',
          contents: [
            {
              type: 'text',
              text: 'FRESHMAIYUU',
              color: '#FFE4E9',
              size: 'xs',
              weight: 'bold'
            },
            {
              type: 'text',
              text: 'บันทึกความทรงจำใหม่ 💕',
              color: '#FFFFFF',
              size: 'lg',
              weight: 'bold',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingTop: '18px',
          paddingBottom: '18px',
          paddingStart: '20px',
          paddingEnd: '20px',
          contents: [
            {
              type: 'text',
              text: title || 'ความทรงจำของเรา 💕',
              weight: 'bold',
              size: 'md',
              color: '#0F172A',
              wrap: true
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '🏷️ หมวดหมู่',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: catLabel,
                      color: '#1E293B',
                      size: 'sm',
                      weight: 'bold',
                      wrap: true,
                      flex: 7
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📅 วันที่',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: formattedDate,
                      color: '#1E293B',
                      size: 'sm',
                      weight: 'bold',
                      wrap: true,
                      flex: 7
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '⏰ เวลา',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: currentTime,
                      color: '#1E293B',
                      size: 'sm',
                      weight: 'bold',
                      wrap: true,
                      flex: 7
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📱 อุปกรณ์',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: device,
                      color: '#334155',
                      size: 'sm',
                      wrap: true,
                      flex: 7
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              backgroundColor: '#F8FAFC',
              cornerRadius: 'md',
              paddingAll: '12px',
              contents: [
                {
                  type: 'text',
                  text: caption ? `💬 ${caption}` : '💬 บันทึกความทรงจำและช่วงเวลาสุดพิเศษของเราสองคน 💕',
                  size: 'xs',
                  color: '#475569',
                  wrap: true
                },
                {
                  type: 'text',
                  text: '✨ เข้าไปดูรูปเพิ่มเติมได้ที่เว็บความทรงจำของเรานะ',
                  size: 'xxs',
                  color: '#94A3B8',
                  margin: 'xs',
                  wrap: true
                }
              ]
            }
          ]
        }
      };

      if (isHttpsImage) {
        flexBubble.hero = {
          type: 'image',
          url: imageUrl,
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover'
        };
      }

      messages.push({
        type: 'flex',
        altText: `📸 มีรูปภาพความทรงจำใหม่: ${title || 'ความทรงจำของเรา'} 💕`,
        contents: flexBubble
      });

      // 2. FALLBACK: Plain text + image if Flex is rejected
      if (isHttpsImage) {
        fallbackMessages.push({
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        });
      }
      fallbackMessages.push({
        type: 'text',
        text: `📸 [แจ้งเตือนความทรงจำใหม่] มีคนอัปรูปใหม่ในเว็บแล้ว! 💕
━━━━━━━━━━━━━━━━━━━━
🌸 หัวข้อ: ${title || 'ความทรงจำของเรา'}
🏷️ หมวดหมู่: ${catLabel}
📅 วันที่ของรูป: ${formattedDate}
💬 ข้อความ: ${caption || 'ไม่มีข้อความ'}
⏰ เวลาที่อัปโหลด: ${currentTime}
📱 ผ่านอุปกรณ์: ${device}
━━━━━━━━━━━━━━━━━━━━
✨ เข้าไปชมรูปหวานๆ ในเว็บของเราได้เลยนะคะ 💖`
      });
    } else {
      // Default: Wrong PIN Security Alert
      const securityBubble = {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#991B1B',
          paddingTop: '16px',
          paddingBottom: '16px',
          paddingStart: '20px',
          paddingEnd: '20px',
          contents: [
            {
              type: 'text',
              text: 'SECURITY ALERT',
              color: '#FCA5A5',
              size: 'xs',
              weight: 'bold'
            },
            {
              type: 'text',
              text: 'แจ้งเตือนความปลอดภัย 🚨',
              color: '#FFFFFF',
              size: 'lg',
              weight: 'bold',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingTop: '18px',
          paddingBottom: '18px',
          paddingStart: '20px',
          paddingEnd: '20px',
          contents: [
            {
              type: 'text',
              text: '❌ มีคนใส่รหัส PIN ไม่ถูกต้อง',
              weight: 'bold',
              size: 'md',
              color: '#991B1B',
              wrap: true
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '🔢 รหัสที่กด',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: enteredPin || 'ไม่ระบุ',
                      color: '#1E293B',
                      size: 'sm',
                      weight: 'bold',
                      wrap: true,
                      flex: 7
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '⚠️ ครั้งที่',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: `${attemptCount || 1}`,
                      color: '#DC2626',
                      size: 'sm',
                      weight: 'bold',
                      wrap: true,
                      flex: 7
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '⏰ เวลา',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: currentTime,
                      color: '#1E293B',
                      size: 'sm',
                      weight: 'bold',
                      wrap: true,
                      flex: 7
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📱 อุปกรณ์',
                      color: '#64748B',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: device,
                      color: '#334155',
                      size: 'sm',
                      wrap: true,
                      flex: 7
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              backgroundColor: '#FEF2F2',
              cornerRadius: 'md',
              paddingAll: '12px',
              contents: [
                {
                  type: 'text',
                  text: '💬 มีคนแอบกด หรือแฟนจำรหัสวันสำคัญไม่ได้นะ? 🥺',
                  size: 'xs',
                  color: '#991B1B',
                  wrap: true
                }
              ]
            }
          ]
        }
      };

      messages.push({
        type: 'flex',
        altText: '🚨 [แจ้งเตือนความปลอดภัย] มีคนพยายามปลดล็อกเว็บ!',
        contents: securityBubble
      });

      fallbackMessages.push({
        type: 'text',
        text: `🚨 [แจ้งเตือนความปลอดภัย] มีคนพยายามปลดล็อกเว็บ!
━━━━━━━━━━━━━━━━━━━━
❌ สถานะ: ใส่รหัส PIN ไม่ถูกต้อง
🔢 รหัสที่ลองกด: ${enteredPin || 'ไม่ระบุ'}
⚠️ ใส่ผิดครั้งที่: ${attemptCount || 1}
⏰ เวลา: ${currentTime}
📱 อุปกรณ์: ${device}
━━━━━━━━━━━━━━━━━━━━
💬 มีคนแอบกด หรือแฟนจำรหัสวันสำคัญไม่ได้นะ? 🥺`
      });
    }

    // Try sending Primary Flex Message
    let response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_TARGET_ID,
        messages: messages
      })
    });

    let data = await response.json().catch(() => ({}));

    // If Flex Message was rejected, automatically fallback to text message
    if (!response.ok && fallbackMessages.length > 0) {
      console.warn('LINE Flex failed, retrying with Fallback message:', data);
      response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          to: LINE_TARGET_ID,
          messages: fallbackMessages
        })
      });
      data = await response.json().catch(() => ({}));
    }

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
