/* ==========================================================================
   LOVE MEMORY - ANNIVERSARY & GALLERY APPLICATION LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- DEFAULT STATE & STORAGE CONFIG ---
  const DEFAULT_ANNIVERSARY_DATE = '2026-08-02'; // รหัสผ่านวันครบรอบตั้งต้น: 02/08/2026
  const DEFAULT_COUPLE_NAMES = 'You & Me 💕';
  const IMGBB_API_KEY = '2855f6e88ea6637643a68de851842e49'; // ImgBB Cloud Storage API Key

  // --- SUPABASE REALTIME CLOUD SYNC CONFIG ---
  const SUPABASE_URL = 'https://vqawcettdkjbhmxevyuk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_FKlGbWAjQ5o-FoJT029OHQ_Gi2GC_D3';
  let supabase = null;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  let config = {
    anniversaryDate: localStorage.getItem('love_anniversary_date') || DEFAULT_ANNIVERSARY_DATE,
    coupleNames: localStorage.getItem('love_couple_names') || DEFAULT_COUPLE_NAMES,
    theme: localStorage.getItem('love_theme') || 'default',
    unlocked: sessionStorage.getItem('love_unlocked') === 'true'
  };

  // --- CLEAN SLATE INITIALIZATION (CLEARED ALL PLACEHOLDERS) ---
  let savedPhotos = null;
  try {
    const raw = localStorage.getItem('love_photos');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out sample placeholders
        savedPhotos = parsed.filter(p => p.id !== 'photo-1' && p.id !== 'photo-2' && p.id !== 'photo-3');
      }
    }
  } catch (e) {
    console.error(e);
  }

  let photos = Array.isArray(savedPhotos) ? savedPhotos : [];
  try { localStorage.setItem('love_photos', JSON.stringify(photos)); } catch (e) { }

  let savedBucket = null;
  try {
    const rawB = localStorage.getItem('love_bucket');
    if (rawB) {
      const parsedB = JSON.parse(rawB);
      if (Array.isArray(parsedB)) {
        savedBucket = parsedB.filter(b => b.id !== 'b1' && b.id !== 'b2' && b.id !== 'b3' && b.id !== 'b4');
      }
    }
  } catch (e) {
    console.error(e);
  }

  let bucketList = Array.isArray(savedBucket) ? savedBucket : [];
  try { localStorage.setItem('love_bucket', JSON.stringify(bucketList)); } catch (e) { }

  // --- CALENDAR STATE & STORAGE ---
  let savedCalendar = null;
  try {
    const rawC = localStorage.getItem('love_calendar');
    if (rawC) {
      const parsedC = JSON.parse(rawC);
      if (Array.isArray(parsedC)) {
        savedCalendar = parsedC;
      }
    }
  } catch (e) {
    console.error(e);
  }

  let calendarNotes = Array.isArray(savedCalendar) ? savedCalendar : [];
  try { localStorage.setItem('love_calendar', JSON.stringify(calendarNotes)); } catch (e) { }

  // --- TRACK DELETED ITEMS TO PREVENT RE-SYNC RESTORATION ---
  let deletedPhotoIds = [];
  try {
    const rawDP = localStorage.getItem('love_deleted_photos');
    if (rawDP) deletedPhotoIds = JSON.parse(rawDP);
  } catch (e) { }

  let deletedBucketIds = [];
  try {
    const rawDB = localStorage.getItem('love_deleted_bucket');
    if (rawDB) deletedBucketIds = JSON.parse(rawDB);
  } catch (e) { }

  let deletedCalendarIds = [];
  try {
    const rawDC = localStorage.getItem('love_deleted_calendar');
    if (rawDC) deletedCalendarIds = JSON.parse(rawDC);
  } catch (e) { }

  // Calendar State & Localization
  const now = new Date();
  let currentCalYear = now.getFullYear();
  let currentCalMonth = now.getMonth(); // 0-11
  let activeSelectedDate = null;
  let activeSelectedMood = '💖';
  let activeSelectedCategory = 'date';
  let editingCalendarEntryId = null;

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const THAI_DAYS_FULL = [
    'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
  ];

  // --- DOM ELEMENTS ---
  const lockScreen = document.getElementById('lock-screen');
  const pinDots = document.querySelectorAll('.pin-dot');
  const pinKeypad = document.getElementById('pin-keypad');
  const hintToggle = document.getElementById('hint-toggle');
  const hintText = document.getElementById('hint-text');

  const displayCoupleNames = document.getElementById('display-couple-names');
  const displayAnniversaryDate = document.getElementById('display-anniversary-date');

  const cntDays = document.getElementById('cnt-days');
  const cntHours = document.getElementById('cnt-hours');
  const cntMinutes = document.getElementById('cnt-minutes');
  const cntSeconds = document.getElementById('cnt-seconds');

  const lockAppBtn = document.getElementById('lock-app-btn');

  const galleryGrid = document.getElementById('gallery-grid');
  const filterChips = document.querySelectorAll('.filter-chip');
  const galleryDateFilter = document.getElementById('gallery-date-filter');
  const clearDateBtn = document.getElementById('clear-date-btn');
  const gallerySortSelect = document.getElementById('gallery-sort-select');
  const galleryCountBadge = document.getElementById('gallery-count-badge');
  const galleryPagination = document.getElementById('gallery-pagination');
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Modals
  const uploadModal = document.getElementById('upload-modal');
  const openUploadBtn = document.getElementById('open-upload-btn');
  const closeUploadModal = document.getElementById('close-upload-modal');
  const uploadForm = document.getElementById('upload-form');
  const photoFileInput = document.getElementById('photo-file-input');
  const dropzone = document.getElementById('dropzone');
  const previewContainer = document.getElementById('preview-container');
  const previewImg = document.getElementById('preview-img');

  const lightboxModal = document.getElementById('lightbox-modal');
  const closeLightboxModal = document.getElementById('close-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxCaption = document.getElementById('lightbox-caption');

  const bucketListContainer = document.getElementById('bucket-list-container');
  const addBucketBtn = document.getElementById('add-bucket-btn');

  // Calendar DOM Elements
  const calMonthTitle = document.getElementById('cal-month-title');
  const calPrevBtn = document.getElementById('cal-prev-btn');
  const calNextBtn = document.getElementById('cal-next-btn');
  const calTodayBtn = document.getElementById('cal-today-btn');
  const calAddEntryBtn = document.getElementById('cal-add-entry-btn');
  const calendarDaysGrid = document.getElementById('calendar-days-grid');

  // Calendar Modal DOM Elements
  const calendarModal = document.getElementById('calendar-modal');
  const closeCalendarModal = document.getElementById('close-calendar-modal');
  const calModalBadge = document.getElementById('cal-modal-badge');
  const calModalTitle = document.getElementById('cal-modal-title');
  const calModalEntriesList = document.getElementById('cal-modal-entries-list');
  const calModalPhotosSection = document.getElementById('cal-modal-photos-section');
  const calModalPhotosStrip = document.getElementById('cal-modal-photos-strip');
  const calFormHeading = document.getElementById('cal-form-heading');
  const calendarEntryForm = document.getElementById('calendar-entry-form');
  const calEntryId = document.getElementById('cal-entry-id');
  const calEntryDate = document.getElementById('cal-entry-date');
  const calEntryTitle = document.getElementById('cal-entry-title');
  const calEntryContent = document.getElementById('cal-entry-content');
  const calSubmitBtn = document.getElementById('cal-submit-btn');
  const calCancelEditBtn = document.getElementById('cal-cancel-edit-btn');
  const moodChips = document.querySelectorAll('.mood-chip');

  let activePhotoDataUrl = null;
  let currentFilter = 'all';
  let currentDateFilter = '';
  let currentSortOrder = 'newest';
  let currentPage = 1;
  const ITEMS_PER_PAGE = 9;
  let counterInterval = null;

  // --- SPECIAL ANNUAL DATES & CUSTOM GREETINGS CONFIGURATION ---
  const DEFAULT_GREETINGS = {
    'birthday-moo': 'สุขสันต์วันเกิดนะหมูที่รัก! 🐷💖 ขอให้มีความสุขมากๆ สุขภาพแข็งแรง น่ารักแบบนี้ตลอดไปนะคะ ✨',
    'birthday-auan': 'สุขสันต์วันเกิดนะอ้วนที่รัก! 🐻💖 ขอให้มีความสุขมากๆ รวยๆ เฮงๆ ยิ้มเยอะๆ ในทุกๆ วันนะคะ ✨',
    'anniversary-monthly': 'สุขสันต์วันครบรอบนะที่รัก 💕 ขอบคุณที่อยู่เคียงข้างและสร้างความทรงจำดีๆ ร่วมกันเสมอมานะคะ ( ˘͈ ᵕ ˘͈♡)',
    'anniversary-yearly': '🎉 วันนี้วันครบรอบใหญ่ประจำปีของเรา สุขสันต์วันครบรอบนะคะ ขอบคุณที่รักกันตลอดมานะ ( ˘͈ ᵕ ˘͈♡)'
  };

  let customGreetings = {};
  try {
    const rawG = localStorage.getItem('love_custom_greetings');
    if (rawG) {
      customGreetings = JSON.parse(rawG) || {};
    }
  } catch (e) { }

  const THAI_MONTHS_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  /**
   * Retrieves greeting for a specific date (dateStr: YYYY-MM-DD)
   * Prioritizes the exact custom greeting saved for this specific date/month/year.
   */
  function getGreetingForDate(dateStr, templateKey) {
    if (customGreetings && typeof customGreetings[dateStr] === 'string' && customGreetings[dateStr].trim() !== '') {
      return customGreetings[dateStr].trim();
    }
    if (customGreetings && typeof customGreetings[templateKey] === 'string' && customGreetings[templateKey].trim() !== '') {
      return customGreetings[templateKey].trim();
    }

    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      const yCE = parseInt(parts[0], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      const yBE = yCE + 543;
      const monthName = THAI_MONTHS_NAMES[mIdx] || '';

      if (templateKey === 'birthday-moo') {
        return `สุขสันต์วันเกิดปี ${yBE} นะหมูที่รัก! 🐷💖 ขอให้มีความสุขมากๆ สุขภาพแข็งแรง น่ารักแบบนี้ตลอดไปนะคะ ✨`;
      }
      if (templateKey === 'birthday-auan') {
        return `สุขสันต์วันเกิดปี ${yBE} นะอ้วนที่รัก! 🐻💖 ขอให้มีความสุขมากๆ รวยๆ เฮงๆ ยิ้มเยอะๆ ในทุกๆ วันนะคะ ✨`;
      }
      if (templateKey === 'anniversary-yearly') {
        return `🎉 วันนี้วันครบรอบใหญ่ประจำปี ${yBE} ของเรา สุขสันต์วันครบรอบนะคะ ขอบคุณที่รักกันตลอดมานะ ( ˘͈ ᵕ ˘͈♡)`;
      }
      if (templateKey === 'anniversary-monthly') {
        return `สุขสันต์วันครบรอบประจำเดือน${monthName} ${yBE} นะที่รัก 💕 ขอบคุณที่อยู่เคียงข้างและสร้างความทรงจำดีๆ ร่วมกันเสมอมานะคะ ( ˘͈ ᵕ ˘͈♡)`;
      }
    }

    return DEFAULT_GREETINGS[templateKey] || '';
  }

  async function saveCustomGreetingForDate(dateStr, newText) {
    if (!customGreetings) customGreetings = {};
    customGreetings[dateStr] = (newText !== undefined && newText !== null) ? newText.trim() : '';
    try {
      localStorage.setItem('love_custom_greetings', JSON.stringify(customGreetings));
    } catch (e) { }
    await pushToCloud();
    if (customGreetings[dateStr]) {
      showToast('บันทึกคำอวยพรของรอบนี้เรียบร้อยแล้ว 💕 (ซิงก์เรียลไทม์แล้ว)', 'success');
    } else {
      showToast('บันทึกเรียบร้อย (เว้นว่างคำอวยพรของรอบนี้ไว้) ✨', 'info');
    }
    checkTodaySpecialCelebrations();
    renderSpecialAnnualDates();
  }

  async function resetCustomGreetingForDate(dateStr, templateKey) {
    if (!customGreetings) customGreetings = {};
    if (customGreetings.hasOwnProperty(dateStr)) {
      delete customGreetings[dateStr];
    }
    try {
      localStorage.setItem('love_custom_greetings', JSON.stringify(customGreetings));
    } catch (e) { }
    await pushToCloud();
    showToast('คืนค่าคำอวยพรเริ่มต้นเรียบร้อยแล้ว ✨', 'info');
    checkTodaySpecialCelebrations();
    renderSpecialAnnualDates();
    return DEFAULT_GREETINGS[templateKey] || '';
  }

  const SPECIAL_ANNUAL_DATES = [
    {
      id: 'birthday-moo',
      month: 4,
      day: 28,
      monthDay: '04-28',
      title: 'วันเกิดหมู',
      shortTitle: 'วันเกิดหมู',
      badgeText: '🎂 วันเกิดหมู',
      emoji: '🎂',
      person: 'หมู',
      cardClass: 'birthday-moo',
      icon: '🐷',
      formattedDate: '28 เมษายน (28/04)'
    },
    {
      id: 'birthday-auan',
      month: 5,
      day: 6,
      monthDay: '05-06',
      title: 'วันเกิดอ้วน',
      shortTitle: 'วันเกิดอ้วน',
      badgeText: '🎂 วันเกิดอ้วน',
      emoji: '🎂',
      person: 'อ้วน',
      cardClass: 'birthday-auan',
      icon: '🐻',
      formattedDate: '6 พฤษภาคม (06/05)'
    }
  ];

  // --- PIN LOCK SYSTEM STATE ---
  let enteredPin = '';
  const PIN_LENGTH = 6;
  const VALID_PINS = ['020869', '020826', '280469', '280426', '060569', '060526'];

  // ==========================================================================
  // 1. INITIALIZATION & PIN PASSCODE UNLOCK LOGIC
  // ==========================================================================

  function initApp() {
    // Apply Default Theme
    document.body.setAttribute('data-theme', 'default');

    // Set Header Data
    updateCoupleHeader();

    // Check Lock State
    if (config.unlocked) {
      lockScreen.classList.add('unlocked');
      startLoveCounter();
    } else {
      lockScreen.classList.remove('unlocked');
      enteredPin = '';
      updatePinDots();
    }

    // Render Components
    renderGallery();
    renderCalendar();
    renderBucketList();
    renderSpecialAnnualDates();
    checkTodaySpecialCelebrations();
    updateYouMeStats();
    initTimerSystem();

    // Start Online Realtime Cloud Data Sync (Supabase WebSockets & Fallback)
    syncFromCloud();
    initSupabaseRealtime();
    setInterval(syncFromCloud, 3000); // Polling backup every 3 seconds

    // Init Floating Canvas Hearts Animation
    initHeartsCanvas();
  }

  // --- PIN SYSTEM HANDLERS ---
  function updatePinDots() {
    pinDots.forEach((dot, index) => {
      if (index < enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled', 'error', 'success');
      }
    });
  }

  function handlePinInput(digit) {
    if (config.unlocked) return;
    if (enteredPin.length >= PIN_LENGTH) return;

    enteredPin += digit;
    updatePinDots();

    if (enteredPin.length === PIN_LENGTH) {
      setTimeout(verifyPin, 180);
    }
  }

  function handlePinBackspace() {
    if (config.unlocked) return;
    if (enteredPin.length > 0) {
      enteredPin = enteredPin.slice(0, -1);
      updatePinDots();
    }
  }

  function handlePinClear() {
    if (config.unlocked) return;
    enteredPin = '';
    updatePinDots();
  }

  // --- DISCORD NOTIFICATION HELPERS ---
  const DISCORD_WRONG_PIN_WEBHOOK = 'https://discord.com/api/webhooks/1542139526372270150/s3HQJiI_Zn3xYUi_IznNh23tzl9lWZhKHt9WjW_JSTVYfcmBZdO3r9KKKP9LO7vYanlA';
  const DISCORD_PHOTO_UPLOAD_WEBHOOK = 'https://discord.com/api/webhooks/1542140418924216345/86zGkPkSxNHnlU1UJ0KDhNPzQ51On1zMj2uaRRKRdfhj0jyM9MoIdolz6IlhigzJww8v';

  function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return '📱 iPhone (iOS)';
    if (/iPad/i.test(ua)) return '📱 iPad (iPadOS)';
    if (/Android/i.test(ua)) return '📱 โทรศัพท์ Android';
    if (/Windows NT/i.test(ua)) return '💻 คอมพิวเตอร์ Windows';
    if (/Macintosh/i.test(ua)) return '💻 เครื่อง Mac';
    return '🌐 อุปกรณ์ทั่วไป';
  }

  let wrongPinAttempts = 0;
  async function sendWrongPinDiscordAlert(failedPin) {
    wrongPinAttempts++;
    try {
      const now = new Date();
      const timeString = now.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const device = getDeviceInfo();

      const discordPayload = {
        username: '₊˚ 🚨 Love Security Radar 🚨 ˚₊',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/9373/9373977.png',
        content: '@everyone 🚨 แจ้งเตือนความปลอดภัย: มีคนพยายามปลดล็อกเว็บ!',
        embeds: [
          {
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
                value: `> 🔒 ||\` ${failedPin || 'ไม่ระบุ'} \`|| *(กดเพื่อดู)*`,
                inline: true
              },
              {
                name: '⚠️ **แอบกดผิดรอบที่**',
                value: `> 💢 **รอบที่ ${wrongPinAttempts}**`,
                inline: true
              },
              {
                name: '⏰ **เวลาที่ตรวจพบ**',
                value: `> ⏱️ \`${timeString}\``,
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
            timestamp: now.toISOString()
          }
        ]
      };

      // Direct Discord Webhook Send
      await fetch(DISCORD_WRONG_PIN_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });
    } catch (e) {
      console.warn('Discord Security Alert send error:', e);
    }
  }

  async function sendPhotoUploadDiscordAlert(photoData) {
    try {
      const now = new Date();
      const timeString = now.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const device = getDeviceInfo();

      const categoryMap = {
        'Cute': 'ช่วงเวลาน่ารัก 🐱',
        'First Date': 'เดตแรก ☕',
        'Trips': 'ทริปเที่ยว ✈️',
        'Anniversary': 'วันครบรอบ 🎉',
        'Birthday': 'วันเกิด 🎂'
      };
      const catLabel = categoryMap[photoData.category] || photoData.category || 'ความทรงจำ 💕';

      let formattedDate = photoData.date || 'ไม่ระบุวันที่';
      if (photoData.date && photoData.date.includes('-')) {
        const [y, m, d] = photoData.date.split('-');
        formattedDate = `${d}/${m}/${y}`;
      }

      const captionText = photoData.caption
        ? photoData.caption
        : 'บันทึกความทรงจำและช่วงเวลาสุดพิเศษของเราสองคน 💕';

      const embed = {
        author: {
          name: '˚ʚ 💖 NEW MEMORY UNLOCKED ɞ˚',
          icon_url: 'https://cdn-icons-png.flaticon.com/512/833/833472.png'
        },
        title: `📸 ‧₊˚ 「 ${photoData.title || 'ความทรงจำของเรา'} 」 ˚₊‧ 💕`,
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
            value: `> ⏱️ \`${timeString} น.\``,
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
        timestamp: now.toISOString()
      };

      const discordPayload = {
        username: '₊˚ 🎀 FRESHMAIYUU MEMORIES 🎀 ˚₊',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png',
        content: '@everyone 💕 มีการบันทึกความทรงจำใหม่ในเว็บแล้วน้าาา!',
        embeds: [embed]
      };

      // Direct Discord Webhook Send
      await fetch(DISCORD_PHOTO_UPLOAD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });
    } catch (e) {
      console.warn('Discord Photo Upload Alert send error:', e);
    }
  }

  function verifyPin() {
    if (VALID_PINS.includes(enteredPin)) {
      // SUCCESS: Unlock!
      wrongPinAttempts = 0;
      pinDots.forEach(dot => dot.classList.add('success'));
      config.unlocked = true;
      sessionStorage.setItem('love_unlocked', 'true');

      // Heart burst effect
      spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 35);

      setTimeout(() => {
        lockScreen.classList.add('unlocked');
        startLoveCounter();
        showToast('ปลดล็อกสำเร็จแล้ว ยินดีต้อนรับนะคะ 💕', 'success');
      }, 350);
    } else {
      // ERROR: Shake & Feedback + Send Discord Alert Notification
      const failedPinAttempt = enteredPin;
      sendWrongPinDiscordAlert(failedPinAttempt);

      pinDots.forEach(dot => dot.classList.add('error'));
      const lockCard = document.querySelector('.lock-card');
      if (lockCard) {
        lockCard.classList.add('error-shake');
        setTimeout(() => lockCard.classList.remove('error-shake'), 600);
      }
      showToast(' รหัสผิด จำไม่ได้หรอ🥺 ', 'error', 3500);

      setTimeout(() => {
        enteredPin = '';
        updatePinDots();
      }, 650);
    }
  }

  // Keypad Click Event Delegation
  if (pinKeypad) {
    pinKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.pin-btn');
      if (!btn) return;

      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 150);

      const key = btn.dataset.key;
      const action = btn.dataset.action;

      if (key !== undefined) {
        handlePinInput(key);
      } else if (action === 'backspace') {
        handlePinBackspace();
      } else if (action === 'clear') {
        handlePinClear();
      }
    });
  }

  // Hardware Keyboard Support
  window.addEventListener('keydown', (e) => {
    if (config.unlocked) return;

    if (e.key >= '0' && e.key <= '9') {
      handlePinInput(e.key);
      const keyBtn = document.querySelector(`.pin-btn[data-key="${e.key}"]`);
      if (keyBtn) {
        keyBtn.classList.add('pressed');
        setTimeout(() => keyBtn.classList.remove('pressed'), 150);
      }
    } else if (e.key === 'Backspace') {
      handlePinBackspace();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
      handlePinClear();
    }
  });

  // Toggle Hint
  hintToggle.addEventListener('click', () => {
    hintText.style.display = hintText.style.display === 'none' ? 'block' : 'none';
  });

  // Lock Application Button
  lockAppBtn.addEventListener('click', () => {
    config.unlocked = false;
    sessionStorage.removeItem('love_unlocked');
    enteredPin = '';
    updatePinDots();
    lockScreen.classList.remove('unlocked');
    const floatingTimerPanel = document.getElementById('floating-timer-panel');
    const floatingTimerFab = document.getElementById('floating-timer-fab');
    if (floatingTimerPanel) floatingTimerPanel.classList.remove('active');
    if (floatingTimerFab) floatingTimerFab.classList.remove('panel-open');
    if (counterInterval) clearInterval(counterInterval);
  });

  // ==========================================================================
  // 2. LIVE LOVE COUNTER LOGIC
  // ==========================================================================

  function startLoveCounter() {
    if (counterInterval) clearInterval(counterInterval);

    function updateCounter() {
      const anniversaryTime = new Date(config.anniversaryDate + 'T00:00:00').getTime();
      const currentTime = new Date().getTime();
      let diff = currentTime - anniversaryTime;

      if (diff < 0) {
        // If anniversary date is in future
        cntDays.textContent = '0';
        cntHours.textContent = '00';
        cntMinutes.textContent = '00';
        cntSeconds.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);

      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * (1000 * 60);

      const seconds = Math.floor(diff / 1000);

      cntDays.textContent = days;
      cntHours.textContent = hours < 10 ? '0' + hours : hours;
      cntMinutes.textContent = minutes < 10 ? '0' + minutes : minutes;
      cntSeconds.textContent = seconds < 10 ? '0' + seconds : seconds;
    }

    updateCounter();
    counterInterval = setInterval(updateCounter, 1000);
  }

  function updateCoupleHeader() {
    displayCoupleNames.textContent = config.coupleNames;

    // Format Date string DD/MM/YYYY
    const parts = config.anniversaryDate.split('-');
    const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    displayAnniversaryDate.innerHTML = `<i class="fa-solid fa-calendar-heart"></i> วันครบรอบ: วันที่ 2 ของทุกเดือน (เริ่ม ${formatted})`;
  }

  // --- SPECIAL ANNUAL DATES COUNTDOWN & BIRTHDAYS LOGIC ---
  function calculateDaysUntil(targetMonth, targetDay) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();

    // Exact day
    if (currentMonth === targetMonth && currentDay === targetDay) {
      return 0;
    }

    // Set target date for current year at start of day
    let target = new Date(currentYear, targetMonth - 1, targetDay, 0, 0, 0);
    const startOfToday = new Date(currentYear, today.getMonth(), currentDay, 0, 0, 0);

    if (target.getTime() < startOfToday.getTime()) {
      target = new Date(currentYear + 1, targetMonth - 1, targetDay, 0, 0, 0);
    }

    const oneDay = 1000 * 60 * 60 * 24;
    return Math.ceil((target.getTime() - startOfToday.getTime()) / oneDay);
  }

  function calculateDaysUntilNextMonthlyDate(targetDay = 2) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDate = today.getDate();

    if (currentDate === targetDay) {
      return {
        daysUntil: 0,
        targetMonth: currentMonth + 1,
        targetDay: targetDay,
        targetYear: currentYear
      };
    }

    let nextTarget;
    if (currentDate < targetDay) {
      nextTarget = new Date(currentYear, currentMonth, targetDay, 0, 0, 0);
    } else {
      nextTarget = new Date(currentYear, currentMonth + 1, targetDay, 0, 0, 0);
    }

    const startOfToday = new Date(currentYear, currentMonth, currentDate, 0, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const daysUntil = Math.ceil((nextTarget.getTime() - startOfToday.getTime()) / oneDay);

    return {
      daysUntil,
      targetMonth: nextTarget.getMonth() + 1,
      targetDay: targetDay,
      targetYear: nextTarget.getFullYear()
    };
  }

  function renderSpecialAnnualDates() {
    const specialGrid = document.getElementById('special-dates-grid');
    if (!specialGrid) return;

    specialGrid.innerHTML = '';

    // 1. วันเกิดหมู (28 เมษายน)
    const mooBday = SPECIAL_ANNUAL_DATES.find(d => d.id === 'birthday-moo') || { month: 4, day: 28 };
    const mooDaysUntil = calculateDaysUntil(mooBday.month, mooBday.day);

    // 2. วันเกิดอ้วน (6 พฤษภาคม)
    const auanBday = SPECIAL_ANNUAL_DATES.find(d => d.id === 'birthday-auan') || { month: 5, day: 6 };
    const auanDaysUntil = calculateDaysUntil(auanBday.month, auanBday.day);

    // 3. วันครบรอบรายเดือน (วันที่ 2 ของทุกเดือน)
    const monthlyAnni = calculateDaysUntilNextMonthlyDate(2);

    const items = [
      {
        id: 'anniversary',
        title: 'วันครบรอบของเรา 💕',
        dateText: 'วันที่ 2 ของทุกเดือน',
        targetMonth: monthlyAnni.targetMonth,
        targetDay: 2,
        daysUntil: monthlyAnni.daysUntil,
        cardClass: 'anniversary',
        icon: '💖',
        badgeBg: monthlyAnni.daysUntil === 0 ? 'today-is-day' : '',
        badgeText: monthlyAnni.daysUntil === 0 ? '🎉 วันนี้วันครบรอบ!' : `อีก ${monthlyAnni.daysUntil} วัน`
      },
      {
        id: 'birthday-moo',
        title: 'วันเกิดหมู 🐷🎂',
        dateText: '28 เมษายน ของทุกปี',
        targetMonth: 4,
        targetDay: 28,
        daysUntil: mooDaysUntil,
        cardClass: 'birthday-moo',
        icon: '🐷',
        badgeBg: mooDaysUntil === 0 ? 'today-is-day' : '',
        badgeText: mooDaysUntil === 0 ? '🎉 วันนี้วันเกิดหมู!' : `อีก ${mooDaysUntil} วัน`
      },
      {
        id: 'birthday-auan',
        title: 'วันเกิดอ้วน 🐻🎂',
        dateText: '6 พฤษภาคม ของทุกปี',
        targetMonth: 5,
        targetDay: 6,
        daysUntil: auanDaysUntil,
        cardClass: 'birthday-auan',
        icon: '🐻',
        badgeBg: auanDaysUntil === 0 ? 'today-is-day' : '',
        badgeText: auanDaysUntil === 0 ? '🎉 วันนี้วันเกิดอ้วน!' : `อีก ${auanDaysUntil} วัน`
      }
    ];

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = `special-date-card ${item.cardClass}`;
      card.innerHTML = `
        <div class="special-date-top">
          <div class="special-date-icon">${item.icon}</div>
          <div>
            <div class="special-date-name">${item.title}</div>
            <div class="special-date-daytext">🗓️ ${item.dateText}</div>
          </div>
        </div>
        <div class="special-date-bottom">
          <span class="special-date-countdown-badge ${item.badgeBg}">
            <i class="fa-solid fa-clock"></i> ${item.badgeText}
          </span>
          <span class="special-date-arrow" title="ดูในปฏิทิน">
            ดูปฏิทิน <i class="fa-solid fa-arrow-right"></i>
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        // Switch to calendar tab and navigate to that month and open day modal
        currentCalYear = new Date().getFullYear();
        currentCalMonth = item.targetMonth - 1;
        const calTabBtn = document.querySelector('.nav-tab[data-tab="tab-calendar"]');
        if (calTabBtn) calTabBtn.click();
        renderCalendar();

        const dateStr = `${currentCalYear}-${String(item.targetMonth).padStart(2, '0')}-${String(item.targetDay).padStart(2, '0')}`;
        setTimeout(() => {
          openCalendarDayModal(dateStr);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 180);
      });

      specialGrid.appendChild(card);
    });
  }

  function checkTodaySpecialCelebrations() {
    const todayBanner = document.getElementById('today-birthday-banner');
    if (!todayBanner) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentMonthDay = `${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

    const matchedSpecial = SPECIAL_ANNUAL_DATES.find(s => s.monthDay === currentMonthDay);
    if (matchedSpecial) {
      const greeting = getGreetingForDate(todayStr, matchedSpecial.id);
      todayBanner.style.display = 'block';
      todayBanner.innerHTML = `
        <div class="today-bday-heading">
          🎉 สุขสันต์วันเกิดนะ${matchedSpecial.person}! ${matchedSpecial.icon}🎂💖
        </div>
        ${greeting ? `<div class="today-bday-sub">${escapeHtml(greeting)}</div>` : ''}
      `;

      setTimeout(() => {
        spawnHeartBurst(window.innerWidth / 2, 200, 35);
      }, 400);
    } else if (currentDay === 2) {
      // วันที่ 2 ของทุกเดือนคือวันครบรอบ
      const isYearly = (currentMonth === 8 && currentDay === 2);
      const templateKey = isYearly ? 'anniversary-yearly' : 'anniversary-monthly';
      const greeting = getGreetingForDate(todayStr, templateKey);
      todayBanner.style.display = 'block';
      todayBanner.innerHTML = `
        <div class="today-bday-heading">
          ${isYearly ? '💍 สุขสันต์วันครบรอบใหญ่ประจำปีของเรา! 💕🥂' : '💖 สุขสันต์วันครบรอบนะที่รัก! (วันที่ 2 ของทุกเดือน) 💕'}
        </div>
        ${greeting ? `<div class="today-bday-sub">${escapeHtml(greeting)}</div>` : ''}
      `;

      setTimeout(() => {
        spawnHeartBurst(window.innerWidth / 2, 200, 35);
      }, 400);
    } else {
      todayBanner.style.display = 'none';
    }
  }

  // ==========================================================================
  // 3. PHOTO GALLERY & ALBUM LOGIC
  // ==========================================================================

  function scrollToGalleryTop() {
    const gallerySection = document.getElementById('tab-gallery');
    if (gallerySection) {
      const topOffset = gallerySection.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  }

  function renderGallery() {
    galleryGrid.innerHTML = '';

    // 1. Filter by category
    let filtered = currentFilter === 'all'
      ? photos
      : photos.filter(p => p.category === currentFilter);

    // 2. Filter by date if specified
    if (currentDateFilter) {
      filtered = filtered.filter(p => p.date === currentDateFilter);
    }

    // 3. Sort by date
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (currentSortOrder === 'oldest') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });

    // Update count badge & clear date button
    if (galleryCountBadge) {
      galleryCountBadge.innerHTML = `<i class="fa-solid fa-images"></i> มีทั้งหมด ${filtered.length} รูปภาพ`;
    }
    if (clearDateBtn) {
      clearDateBtn.style.display = currentDateFilter ? 'flex' : 'none';
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    // Check bounds for currentPage
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    if (totalItems === 0) {
      galleryGrid.innerHTML = `
        <div class="empty-gallery">
          <div class="empty-icon">📷</div>
          <h3 style="font-family: var(--font-heading); color: var(--text-dark);">ไม่พบรูปภาพตามเงื่อนไขที่เลือก</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">ลองเปลี่ยนหมวดหมู่ หรือกดปุ่มล้างตัวกรองวันที่ดูสิคะ 💕</p>
        </div>
      `;
      if (galleryPagination) galleryPagination.innerHTML = '';
      return;
    }

    // Slice 9 photos for current page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPhotos = filtered.slice(startIndex, endIndex);

    currentPhotos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'polaroid-card';

      // Format Date
      const parts = photo.date.split('-');
      const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

      card.innerHTML = `
        <div class="card-actions">
          <button class="action-btn delete-btn" data-id="${photo.id}" title="ลบรูปนี้">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <div class="polaroid-img-wrapper">
          <img class="polaroid-img" src="${photo.imageSrc}" alt="${photo.title}" loading="lazy">
        </div>
        <div class="polaroid-caption">
          <div class="polaroid-title">${escapeHtml(photo.title)}</div>
          <div class="polaroid-date">📅 ${formattedDate}</div>
          <span class="polaroid-tag">${photo.category}</span>
        </div>
      `;

      // Card click opens Lightbox Modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return; // Ignore delete click
        openLightbox(photo);
      });

      // Delete action
      const deleteBtn = card.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`คุณต้องการลบรูป "${photo.title}" ใช่หรือไม่?`)) {
          deletePhoto(photo.id);
        }
      });

      galleryGrid.appendChild(card);
    });

    // Render Pagination Controls
    renderPagination(totalItems, totalPages);
    updateYouMeStats();
  }

  function renderPagination(totalItems, totalPages) {
    if (!galleryPagination) return;
    if (totalPages <= 1) {
      galleryPagination.innerHTML = `
        <div class="pagination-info-text">
          แสดงทั้งหมด ${totalItems} รูปภาพ (หน้า 1 จาก 1)
        </div>
      `;
      return;
    }

    const showingStart = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    let paginationHtml = `
      <div class="pagination-wrapper">
        <button class="page-nav-btn" id="prev-page-btn" ${currentPage === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
        </button>
        <div class="pagination-pages">
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        paginationHtml += `<button class="page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (
        (i === currentPage - 2 && currentPage > 3) ||
        (i === currentPage + 2 && currentPage < totalPages - 2)
      ) {
        paginationHtml += `<span class="page-ellipsis">...</span>`;
      }
    }

    paginationHtml += `
        </div>
        <button class="page-nav-btn" id="next-page-btn" ${currentPage === totalPages ? 'disabled' : ''}>
          ถัดไป <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="pagination-info-text">
        หน้า ${currentPage} จาก ${totalPages} • แสดงรูปที่ ${showingStart}-${showingEnd} จากทั้งหมด ${totalItems} รูป
      </div>
    `;

    galleryPagination.innerHTML = paginationHtml;

    // Attach Pagination event listeners
    const prevBtn = galleryPagination.querySelector('#prev-page-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderGallery();
          scrollToGalleryTop();
        }
      });
    }

    const nextBtn = galleryPagination.querySelector('#next-page-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderGallery();
          scrollToGalleryTop();
        }
      });
    }

    const pageBtns = galleryPagination.querySelectorAll('.page-num');
    pageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = parseInt(btn.dataset.page, 10);
        if (targetPage && targetPage !== currentPage) {
          currentPage = targetPage;
          renderGallery();
          scrollToGalleryTop();
        }
      });
    });
  }

  // Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      currentPage = 1;
      renderGallery();
    });
  });

  // Date Filter & Sort Listeners
  if (galleryDateFilter) {
    galleryDateFilter.addEventListener('change', (e) => {
      currentDateFilter = e.target.value;
      currentPage = 1;
      renderGallery();
    });
  }

  if (clearDateBtn) {
    clearDateBtn.addEventListener('click', () => {
      currentDateFilter = '';
      if (galleryDateFilter) galleryDateFilter.value = '';
      currentPage = 1;
      renderGallery();
    });
  }

  if (gallerySortSelect) {
    gallerySortSelect.addEventListener('change', (e) => {
      currentSortOrder = e.target.value;
      renderGallery();
    });
  }

  // Upload Modal Handlers
  openUploadBtn.addEventListener('click', () => {
    uploadModal.classList.add('active');
    document.getElementById('photo-date-input').value = new Date().toISOString().split('T')[0];
  });

  closeUploadModal.addEventListener('click', () => {
    uploadModal.classList.remove('active');
    resetUploadForm();
  });

  // Dropzone File Select
  dropzone.addEventListener('click', () => photoFileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary-hover)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--primary)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  photoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // --- TOAST NOTIFICATIONS HELPER ---
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  function updateSyncBadge(status) {
    const badge = document.getElementById('cloud-sync-status');
    if (!badge) return;
    if (status === 'syncing') {
      badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.75rem; color: #ff9800;"></i> กำลังบันทึกลง Supabase...`;
    } else if (status === 'success') {
      badge.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.5rem; color: #4caf50;"></i> หมูเข้ามาดู`;
    } else if (status === 'offline') {
      badge.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.5rem; color: #888;"></i> หมูออกไปแล้ว`;
    }
  }

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ');
      return;
    }

    // Compress & Resize efficiently to ensure fast sync & fit payload size limits
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000; // max 1000px dimension for fast cloud sync

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        activePhotoDataUrl = canvas.toDataURL('image/jpeg', 0.75); // 75% quality JPEG (~80-120KB)
        previewImg.src = activePhotoDataUrl;
        previewContainer.style.display = 'block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function uploadImageToCloud(base64Data) {
    if (!IMGBB_API_KEY) return base64Data;
    try {
      const formData = new FormData();
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      formData.append('image', cleanBase64);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result && result.success && result.data && result.data.url) {
        return result.data.url; // Returns permanent HTTPS Cloud Image URL!
      }
    } catch (e) {
      console.warn('ImgBB cloud upload fallback:', e);
    }
    return base64Data;
  }

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('photo-title-input').value.trim();
    const date = document.getElementById('photo-date-input').value;
    const category = document.getElementById('photo-cat-select').value;
    const caption = document.getElementById('photo-caption-input').value.trim();

    if (!activePhotoDataUrl) {
      alert('กรุณาเลือกรูปภาพความทรงจำก่อนครับ');
      return;
    }

    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up fa-bounce"></i> กำลังบันทึกลง Supabase...';

    showToast('กำลังเตรียมและบันทึกรูปภาพความทรงจำ...', 'info');

    let cloudImageUrl = activePhotoDataUrl;
    try {
      cloudImageUrl = await uploadImageToCloud(activePhotoDataUrl);
    } catch (err) {
      console.warn('Cloud upload fallback:', err);
    }

    const newPhoto = {
      id: 'photo-' + Date.now(),
      title: title || 'ความทรงจำของเรา',
      date: date || new Date().toISOString().split('T')[0],
      category: category,
      caption: caption || 'บันทึกความรู้สึกหวานๆ 💕',
      imageSrc: cloudImageUrl,
      updatedAt: Date.now()
    };

    photos.unshift(newPhoto); // Add to top locally
    currentPage = 1;
    renderGallery();
    renderCalendar();

    // Close Modal immediately for smooth UI
    uploadModal.classList.remove('active');
    resetUploadForm();
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;

    // Burst hearts celebration
    spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 25);

    // Save to Local & Supabase Cloud
    await savePhotos();

    // Trigger Discord Photo Notification (in background)
    sendPhotoUploadDiscordAlert(newPhoto);
  });

  function resetUploadForm() {
    uploadForm.reset();
    activePhotoDataUrl = null;
    previewContainer.style.display = 'none';
    previewImg.src = '';
  }

  async function deletePhoto(id) {
    if (!deletedPhotoIds.includes(id)) {
      deletedPhotoIds.push(id);
      try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch (e) { }
    }

    photos = photos.filter(p => p.id !== id);
    renderGallery();
    renderCalendar();

    // Explicitly delete from Supabase love_memories table
    if (supabase) {
      try {
        await supabase.from('love_memories').delete().eq('id', String(id));
      } catch (err) {
        console.warn('Supabase delete photo error:', err);
      }
    }

    await savePhotos();
    showToast('ลบรูปภาพเรียบร้อยแล้ว 🗑️', 'info');
  }

  // --- SUPABASE REALTIME CLOUD DATA SYNC ENGINE ---
  let isCloudSaving = false;
  const FALLBACK_SYNC_URL = 'https://api.npoint.io/e0d65a88c3f58a74e508';

  async function syncFromCloud() {
    if (isCloudSaving) return; // Skip sync if currently pushing local changes
    try {
      let cloudPhotos = null;
      let cloudBucket = null;
      let cloudCalendar = null;

      // 1. Try Supabase JS Client (Separate Tables or Shared JSON)
      if (supabase) {
        try {
          // Check unified love_data table first for deleted IDs & unified data
          const { data: rows } = await supabase.from('love_data').select('data').eq('id', 'shared_app_data');
          if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            const d = rows[0].data;
            if (Array.isArray(d.deletedPhotoIds)) {
              d.deletedPhotoIds.forEach(id => { if (!deletedPhotoIds.includes(String(id))) deletedPhotoIds.push(String(id)); });
              try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch (e) { }
            }
            if (Array.isArray(d.deletedCalendarIds)) {
              d.deletedCalendarIds.forEach(id => { if (!deletedCalendarIds.includes(String(id))) deletedCalendarIds.push(String(id)); });
              try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch (e) { }
            }
            if (Array.isArray(d.deletedBucketIds)) {
              d.deletedBucketIds.forEach(id => { if (!deletedBucketIds.includes(String(id))) deletedBucketIds.push(String(id)); });
              try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch (e) { }
            }

            if (d.customGreetings && typeof d.customGreetings === 'object') {
              if (JSON.stringify(d.customGreetings) !== JSON.stringify(customGreetings)) {
                customGreetings = Object.assign({}, d.customGreetings);
                try { localStorage.setItem('love_custom_greetings', JSON.stringify(customGreetings)); } catch (e) { }
                renderSpecialAnnualDates();
                checkTodaySpecialCelebrations();
              }
            }

            if (d.activeTimer !== undefined && typeof window.handleCloudTimerSync === 'function') {
              window.handleCloudTimerSync(d.activeTimer);
            }

            if (Array.isArray(d.photos)) cloudPhotos = d.photos;
            if (Array.isArray(d.bucketList)) cloudBucket = d.bucketList;
            if (Array.isArray(d.calendarNotes)) cloudCalendar = d.calendarNotes;
          }

          // Check love_memories table if not in unified
          if (!cloudPhotos) {
            const { data: memRows } = await supabase.from('love_memories').select('*');
            if (Array.isArray(memRows)) {
              cloudPhotos = memRows.map(r => ({
                id: String(r.id),
                title: r.title,
                date: r.date,
                category: r.category,
                caption: r.caption,
                imageSrc: r.image_url || r.imageSrc
              }));
            }
          }

          // Check love_bucket table if not in unified
          if (!cloudBucket) {
            const { data: bucketRows } = await supabase.from('love_bucket').select('*');
            if (Array.isArray(bucketRows)) {
              cloudBucket = bucketRows.map(r => ({
                id: String(r.id),
                text: r.text,
                completed: !!r.completed
              }));
            }
          }

          // Check love_calendar table if not in unified
          if (!cloudCalendar) {
            const { data: calRows } = await supabase.from('love_calendar').select('*');
            if (Array.isArray(calRows)) {
              cloudCalendar = calRows.map(r => ({
                id: String(r.id),
                date: r.date,
                title: r.title,
                content: r.content || '',
                mood: r.mood || '💖',
                category: r.category || 'date',
                updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now()
              }));
            }
          }
        } catch (err) {
          console.warn('Supabase fetch error:', err);
        }
      }

      // 2. Try Supabase REST API Fallback
      if (!cloudPhotos || !cloudBucket || !cloudCalendar) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/love_data?id=eq.shared_app_data&select=data`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
              const d = rows[0].data;
              if (Array.isArray(d.deletedPhotoIds)) {
                d.deletedPhotoIds.forEach(id => { if (!deletedPhotoIds.includes(String(id))) deletedPhotoIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch (e) { }
              }
              if (Array.isArray(d.deletedCalendarIds)) {
                d.deletedCalendarIds.forEach(id => { if (!deletedCalendarIds.includes(String(id))) deletedCalendarIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch (e) { }
              }
              if (Array.isArray(d.deletedBucketIds)) {
                d.deletedBucketIds.forEach(id => { if (!deletedBucketIds.includes(String(id))) deletedBucketIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch (e) { }
              }

              if (d.customGreetings && typeof d.customGreetings === 'object') {
                if (JSON.stringify(d.customGreetings) !== JSON.stringify(customGreetings)) {
                  customGreetings = Object.assign({}, d.customGreetings);
                  try { localStorage.setItem('love_custom_greetings', JSON.stringify(customGreetings)); } catch (e) { }
                  renderSpecialAnnualDates();
                  checkTodaySpecialCelebrations();
                }
              }

              if (!cloudPhotos && Array.isArray(d.photos)) cloudPhotos = d.photos;
              if (!cloudBucket && Array.isArray(d.bucketList)) cloudBucket = d.bucketList;
              if (!cloudCalendar && Array.isArray(d.calendarNotes)) cloudCalendar = d.calendarNotes;
            }
          }
        } catch (err) { }
      }

      // 3. Fallback Online Store if Supabase is still connecting
      if (!cloudPhotos && !cloudBucket && !cloudCalendar) {
        try {
          const res = await fetch(FALLBACK_SYNC_URL);
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
              if (Array.isArray(data.deletedPhotoIds)) {
                data.deletedPhotoIds.forEach(id => { if (!deletedPhotoIds.includes(String(id))) deletedPhotoIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch (e) { }
              }
              if (Array.isArray(data.deletedCalendarIds)) {
                data.deletedCalendarIds.forEach(id => { if (!deletedCalendarIds.includes(String(id))) deletedCalendarIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch (e) { }
              }
              if (Array.isArray(data.deletedBucketIds)) {
                data.deletedBucketIds.forEach(id => { if (!deletedBucketIds.includes(String(id))) deletedBucketIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch (e) { }
              }

              if (data.customGreetings && typeof data.customGreetings === 'object') {
                if (JSON.stringify(data.customGreetings) !== JSON.stringify(customGreetings)) {
                  customGreetings = Object.assign({}, data.customGreetings);
                  try { localStorage.setItem('love_custom_greetings', JSON.stringify(customGreetings)); } catch (e) { }
                  renderSpecialAnnualDates();
                  checkTodaySpecialCelebrations();
                }
              }

              if (Array.isArray(data.photos)) cloudPhotos = data.photos;
              if (Array.isArray(data.bucketList)) cloudBucket = data.bucketList;
              if (Array.isArray(data.calendarNotes)) cloudCalendar = data.calendarNotes;
            }
          }
        } catch (err) { }
      }

      // --- APPLY CLOUD DATA & EXCLUDE DELETED ITEMS ---
      if (Array.isArray(cloudPhotos)) {
        const cleanCloudPhotos = cloudPhotos.filter(p =>
          p && p.id &&
          p.id !== 'photo-1' && p.id !== 'photo-2' && p.id !== 'photo-3' &&
          !deletedPhotoIds.includes(String(p.id))
        );

        if (JSON.stringify(cleanCloudPhotos) !== JSON.stringify(photos)) {
          photos = cleanCloudPhotos;
          try { localStorage.setItem('love_photos', JSON.stringify(photos)); } catch (e) { }
          renderGallery();
          renderCalendar();
          if (activeSelectedDate && calendarModal && calendarModal.classList.contains('active')) {
            renderModalPhotosForDate(activeSelectedDate);
          }
        }
      }

      if (Array.isArray(cloudBucket)) {
        const cleanCloudBucket = cloudBucket.filter(b =>
          b && b.id &&
          b.id !== 'b1' && b.id !== 'b2' && b.id !== 'b3' && b.id !== 'b4' &&
          !deletedBucketIds.includes(String(b.id))
        );

        if (JSON.stringify(cleanCloudBucket) !== JSON.stringify(bucketList)) {
          bucketList = cleanCloudBucket;
          try { localStorage.setItem('love_bucket', JSON.stringify(bucketList)); } catch (e) { }
          renderBucketList();
        }
      }

      if (Array.isArray(cloudCalendar)) {
        const cleanCloudCal = cloudCalendar.filter(c =>
          c && c.id &&
          !deletedCalendarIds.includes(String(c.id))
        );

        if (JSON.stringify(cleanCloudCal) !== JSON.stringify(calendarNotes)) {
          calendarNotes = cleanCloudCal;
          try { localStorage.setItem('love_calendar', JSON.stringify(calendarNotes)); } catch (e) { }
          renderCalendar();
          if (activeSelectedDate && calendarModal && calendarModal.classList.contains('active')) {
            renderModalEntriesForDate(activeSelectedDate);
          }
        }
      }

      updateSyncBadge('success');
    } catch (e) {
      console.warn('Sync fetch warning:', e);
      updateSyncBadge('offline');
    }
  }

  async function pushToCloud() {
    isCloudSaving = true;
    updateSyncBadge('syncing');
    try {
      const payload = {
        photos: photos,
        bucketList: bucketList,
        calendarNotes: calendarNotes,
        customGreetings: customGreetings,
        activeTimer: activeTimerState || null,
        deletedPhotoIds: deletedPhotoIds,
        deletedCalendarIds: deletedCalendarIds,
        deletedBucketIds: deletedBucketIds,
        lastUpdated: Date.now()
      };

      let pushedSupabase = false;

      // 1. Push to Supabase via JS Client
      try {
        if (supabase) {
          // Attempt unified love_data upsert
          const { error: dataErr } = await supabase.from('love_data').upsert({
            id: 'shared_app_data',
            data: payload,
            updated_at: new Date().toISOString()
          });
          if (!dataErr) pushedSupabase = true;

          // Attempt love_memories table upsert
          if (photos.length > 0) {
            const memoryRows = photos.map(p => ({
              id: String(p.id),
              title: p.title || '',
              date: p.date || new Date().toISOString().split('T')[0],
              category: p.category || 'Cute',
              caption: p.caption || '',
              image_url: p.imageSrc || '',
              updated_at: new Date().toISOString()
            }));
            await supabase.from('love_memories').upsert(memoryRows);
          }

          // Attempt love_bucket table upsert
          if (bucketList.length > 0) {
            const bucketRows = bucketList.map(b => ({
              id: String(b.id),
              text: b.text || '',
              completed: !!b.completed,
              updated_at: new Date().toISOString()
            }));
            await supabase.from('love_bucket').upsert(bucketRows);
          }

          // Attempt love_calendar table upsert
          if (calendarNotes.length > 0) {
            const calRows = calendarNotes.map(c => ({
              id: String(c.id),
              date: c.date,
              title: c.title || '',
              content: c.content || '',
              mood: c.mood || '💖',
              category: c.category || 'date',
              updated_at: new Date().toISOString()
            }));
            await supabase.from('love_calendar').upsert(calRows);
          }
        }

        // 2. Supabase REST API Fallback
        if (!pushedSupabase) {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/love_data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              id: 'shared_app_data',
              data: payload,
              updated_at: new Date().toISOString()
            })
          });
          if (res.ok) pushedSupabase = true;
        }
      } catch (e) {
        console.warn('Supabase push warning:', e);
      }

      // 3. Sync to Fallback Cloud Store as backup
      try {
        await fetch(FALLBACK_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) { }

      updateSyncBadge('success');
      return true;
    } catch (e) {
      console.warn('Push cloud error:', e);
      updateSyncBadge('offline');
      return false;
    } finally {
      setTimeout(() => { isCloudSaving = false; }, 800);
    }
  }

  function initSupabaseRealtime() {
    if (!supabase) return;
    try {
      supabase
        .channel('public:love_data')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'love_data' }, () => {
          syncFromCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'love_memories' }, () => {
          syncFromCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'love_bucket' }, () => {
          syncFromCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'love_calendar' }, () => {
          syncFromCloud();
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase Realtime subscription warning:', e);
    }
  }

  async function savePhotos() {
    try {
      localStorage.setItem('love_photos', JSON.stringify(photos));
    } catch (err) {
      console.warn('LocalStorage limit:', err);
    }
    const success = await pushToCloud();
    if (success) {
      showToast('บันทึกรูปภาพความทรงจำลง Supabase เรียบร้อยแล้ว 💕', 'success');
    } else {
      showToast('บันทึกไว้ในอุปกรณ์เรียบร้อยแล้ว (จะซิงก์ขึ้น Supabase เมื่อออนไลน์)', 'info');
    }
  }

  async function saveCalendarNotes() {
    try {
      localStorage.setItem('love_calendar', JSON.stringify(calendarNotes));
    } catch (err) {
      console.warn('LocalStorage limit:', err);
    }
    const success = await pushToCloud();
    if (success) {
      showToast('บันทึกข้อมูลปฏิทินลง Supabase เรียบร้อยแล้ว 💕', 'success');
    } else {
      showToast('บันทึกในอุปกรณ์เรียบร้อยแล้ว (จะซิงก์ขึ้น Supabase เมื่อออนไลน์)', 'info');
    }
  }

  async function saveBucketList() {
    try {
      localStorage.setItem('love_bucket', JSON.stringify(bucketList));
    } catch (err) {
      console.warn('LocalStorage limit:', err);
    }
    const success = await pushToCloud();
    if (success) {
      showToast('ซิงก์บักเก็ตลิสต์ลง Supabase เรียบร้อยแล้ว ✨', 'success');
    } else {
      showToast('บันทึกบักเก็ตลิสต์เรียบร้อยแล้ว', 'info');
    }
  }

  // Lightbox Modal
  function openLightbox(photo) {
    lightboxImg.src = photo.imageSrc;
    lightboxTitle.textContent = photo.title;

    const parts = photo.date.split('-');
    lightboxDate.textContent = `📅 วันที่: ${parts[2]}/${parts[1]}/${parts[0]} (${photo.category})`;
    lightboxCaption.textContent = photo.caption || 'ไม่มีข้อความแคปชั่น';

    lightboxModal.classList.add('active');
  }

  closeLightboxModal.addEventListener('click', () => {
    lightboxModal.classList.remove('active');
  });

  // ==========================================================================
  // 4. LOVE CALENDAR & DAILY DIARY SYSTEM (SCRAPBOOK AESTHETIC)
  // ==========================================================================

  function renderCalendar() {
    if (!calendarDaysGrid || !calMonthTitle) return;

    // 1. Update Month & Year Title in Thai (e.g. "พฤษภาคม 2569")
    const thaiMonthName = THAI_MONTHS[currentCalMonth];
    const thaiYearBE = currentCalYear + 543;
    calMonthTitle.textContent = `${thaiMonthName} ${thaiYearBE}`;

    calendarDaysGrid.innerHTML = '';

    // 2. Compute Dates
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Anniversary month/day comparison
    const anniParts = (config.anniversaryDate || '').split('-');
    const anniMonthDay = anniParts.length === 3 ? `${anniParts[1]}-${anniParts[2]}` : '';

    // First day of current month (0: Sun, 1: Mon, ..., 6: Sat)
    const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
    // Total days in current month
    const totalDaysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    // Total days in previous month
    const totalDaysInPrevMonth = new Date(currentCalYear, currentCalMonth, 0).getDate();

    // 3. Render Previous Month Padding Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(currentCalYear, currentCalMonth - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      const isAnniversary = (dayNum === 2);

      const dayCell = createCalendarDayCell(dayNum, dateStr, true, false, isAnniversary);
      calendarDaysGrid.appendChild(dayCell);
    }

    // 4. Render Current Month Days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = (dateStr === todayStr);
      const isAnniversary = (d === 2); // วันที่ 2 ของทุกเดือนคือวันครบรอบ

      const dayCell = createCalendarDayCell(d, dateStr, false, isToday, isAnniversary);
      calendarDaysGrid.appendChild(dayCell);
    }

    // 5. Render Next Month Padding Days to fill grid (35 or 42 slots)
    const totalRendered = firstDayIndex + totalDaysInMonth;
    const totalSlots = totalRendered > 35 ? 42 : 35;
    const remainingDays = totalSlots - totalRendered;

    for (let nextDay = 1; nextDay <= remainingDays; nextDay++) {
      const nextDate = new Date(currentCalYear, currentCalMonth + 1, nextDay);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      const isAnniversary = (nextDay === 2);

      const dayCell = createCalendarDayCell(nextDay, dateStr, true, false, isAnniversary);
      calendarDaysGrid.appendChild(dayCell);
    }
    updateYouMeStats();
  }

  function createCalendarDayCell(dayNum, dateStr, isOtherMonth = false, isToday = false, isAnniversary = false) {
    const matchedBirthday = SPECIAL_ANNUAL_DATES.find(b => dateStr.endsWith(b.monthDay));
    const isBirthday = !isOtherMonth && !!matchedBirthday;
    const isDay2 = (isAnniversary || dayNum === 2);

    const dayCell = document.createElement('div');
    dayCell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isDay2 ? 'anniversary-day' : ''} ${isBirthday ? 'birthday-day' : ''}`;
    dayCell.dataset.date = dateStr;

    // Day of week class for coloring (Sunday / Saturday)
    const dObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dObj.getDay();
    if (dayOfWeek === 0) dayCell.classList.add('sunday');
    if (dayOfWeek === 6) dayCell.classList.add('saturday');

    // Get entries for this date
    const dayEntries = calendarNotes.filter(item => item.date === dateStr);
    // Get photos for this date
    const dayPhotos = photos.filter(p => p.date === dateStr);

    let badgesHtml = '';
    if (isToday) {
      badgesHtml += `<span class="badge-tag badge-today">วันนี้</span>`;
    }
    if (isDay2) {
      const isYearly = dateStr.endsWith('-08-02');
      badgesHtml += `<span class="badge-tag badge-anni" title="${isYearly ? 'วันครบรอบใหญ่ของเรา (02/08) 💕' : 'วันครบรอบประจำเดือน (วันที่ 2 ของทุกเดือน) 💕'}">💖 ครบรอบ</span>`;
    }
    if (isBirthday && matchedBirthday) {
      badgesHtml += `<span class="badge-tag badge-birthday" title="${matchedBirthday.title}">🎂 ${matchedBirthday.shortTitle}</span>`;
    }

    let entriesHtml = '';
    if (dayEntries.length > 0) {
      // Show up to 2 entries in the cell
      const visibleEntries = dayEntries.slice(0, 2);
      visibleEntries.forEach(entry => {
        const catClass = entry.category || 'date';
        entriesHtml += `
          <div class="cal-entry-chip ${catClass}" title="${escapeHtml(entry.title)}">
            <span class="cal-entry-chip-emoji">${entry.mood || '💖'}</span>
            <span class="cal-entry-chip-text">${escapeHtml(entry.title)}</span>
          </div>
        `;
      });

      if (dayEntries.length > 2) {
        entriesHtml += `<div class="cal-more-entries">+${dayEntries.length - 2} บันทึกอีก</div>`;
      }
    }

    // Photo badge if photos exist on this date
    let photosBadgeHtml = '';
    if (dayPhotos.length > 0) {
      photosBadgeHtml = `
        <div class="cal-photo-chip" title="มีรูปภาพ ${dayPhotos.length} รูป">
          <i class="fa-solid fa-camera"></i> <span class="cal-photo-chip-text">${dayPhotos.length} รูป</span>
        </div>
      `;
    }

    dayCell.innerHTML = `
      <div class="cal-day-top">
        <span class="cal-day-number">${dayNum}</span>
        <div class="cal-day-badges">${badgesHtml}</div>
      </div>
      <div class="cal-day-entries">
        ${entriesHtml}
        ${photosBadgeHtml}
      </div>
      <button type="button" class="cal-cell-add-btn" title="เขียนบันทึกวันที่ ${dayNum}">
        <i class="fa-solid fa-plus"></i>
      </button>
    `;

    // Click anywhere on cell to open date modal
    dayCell.addEventListener('click', (e) => {
      openCalendarDayModal(dateStr, e.target.closest('.cal-cell-add-btn') !== null);
    });

    return dayCell;
  }

  // --- CALENDAR DAY MODAL & DIARY MANAGEMENT ---
  function openCalendarDayModal(dateStr, autoFocusInput = false) {
    if (!calendarModal) return;
    activeSelectedDate = dateStr;

    // 1. Format Full Thai Date for Modal Header
    const parts = dateStr.split('-');
    const yearCE = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const dayNum = parseInt(parts[2], 10);
    const dObj = new Date(yearCE, monthNum, dayNum);
    const dayName = THAI_DAYS_FULL[dObj.getDay()];
    const monthName = THAI_MONTHS[monthNum];
    const yearBE = yearCE + 543;

    if (calModalBadge) {
      calModalBadge.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${dayName}ที่ ${dayNum} ${monthName} ${yearBE}`;
    }

    // Remove existing birthday/anniversary hero if any
    const existingHero = calendarModal.querySelector('.cal-birthday-hero-box');
    if (existingHero) existingHero.remove();

    const matchedBirthday = SPECIAL_ANNUAL_DATES.find(b => dateStr.endsWith(b.monthDay));
    let specialTypeKey = null;
    let specialTitle = '';
    let specialIcon = '';

    if (matchedBirthday) {
      specialTypeKey = matchedBirthday.id;
      specialTitle = `✨ วันสำคัญประจำปี: ${matchedBirthday.title} (${matchedBirthday.formattedDate}) 🎉`;
      specialIcon = matchedBirthday.icon;
    } else if (dayNum === 2) {
      const isYearly = dateStr.endsWith('-08-02');
      specialTypeKey = isYearly ? 'anniversary-yearly' : 'anniversary-monthly';
      specialTitle = isYearly ? '✨ วันครบรอบใหญ่ประจำปี (2 สิงหาคม) 💕' : '✨ วันครบรอบประจำเดือนของเรา (วันที่ 2 ของทุกเดือน) 💕';
      specialIcon = '💖';
    }

    if (specialTypeKey) {
      const currentGreetingText = getGreetingForDate(dateStr, specialTypeKey);
      const isAnni = specialTypeKey.startsWith('anniversary');
      const formattedGreetingHtml = currentGreetingText
        ? escapeHtml(currentGreetingText)
        : '<span style="opacity: 0.6; font-style: italic; font-size: 0.85rem;">(ไม่มีข้อความคำอวยพรของรอบนี้ - กดรูปปากกา ✏️ เพื่อเขียนได้นะคะ)</span>';

      const heroBox = document.createElement('div');
      heroBox.className = 'cal-birthday-hero-box';
      if (isAnni) {
        heroBox.style.borderColor = '#ff4081';
        heroBox.style.background = 'linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%)';
      }

      heroBox.innerHTML = `
        <div class="cal-birthday-hero-icon">${specialIcon}</div>
        <div class="cal-birthday-hero-body">
          <div class="cal-birthday-hero-title" style="${isAnni ? 'color: #d81b60;' : ''}">${specialTitle}</div>
          <div class="cal-birthday-hero-desc" id="hero-greeting-view">${formattedGreetingHtml}</div>
          
          <div class="cal-birthday-hero-edit-mode" id="hero-greeting-edit" style="display: none; margin-top: 8px;">
            <textarea id="hero-greeting-input" class="hero-edit-textarea" rows="3" placeholder="เขียนคำอวยพรเฉพาะของรอบนี้... (สามารถเว้นว่างไว้ได้)"></textarea>
            <div class="hero-edit-actions">
              <button type="button" id="btn-save-greeting" class="btn-hero-action save">
                <i class="fa-solid fa-check"></i> บันทึกคำอวยพร
              </button>
              <button type="button" id="btn-cancel-greeting" class="btn-hero-action cancel">
                ยกเลิก
              </button>
              <button type="button" id="btn-reset-greeting" class="btn-hero-action reset" title="รีเซ็ตเป็นคำอวยพรเริ่มต้น">
                <i class="fa-solid fa-rotate-left"></i> คืนค่าเดิม
              </button>
            </div>
          </div>
        </div>
        <button type="button" class="btn-edit-greeting-trigger" id="btn-edit-greeting-trigger" title="แก้ไขข้อความคำอวยพรของวันนี้">
          <i class="fa-solid fa-pen"></i>
        </button>
      `;

      const modalHeader = calendarModal.querySelector('.cal-modal-header');
      if (modalHeader) {
        modalHeader.insertAdjacentElement('afterend', heroBox);
      }

      // Attach Edit Listeners
      const btnEditTrigger = heroBox.querySelector('#btn-edit-greeting-trigger');
      const viewArea = heroBox.querySelector('#hero-greeting-view');
      const editArea = heroBox.querySelector('#hero-greeting-edit');
      const textarea = heroBox.querySelector('#hero-greeting-input');
      const btnSave = heroBox.querySelector('#btn-save-greeting');
      const btnCancel = heroBox.querySelector('#btn-cancel-greeting');
      const btnReset = heroBox.querySelector('#btn-reset-greeting');

      if (btnEditTrigger && viewArea && editArea && textarea) {
        btnEditTrigger.addEventListener('click', () => {
          textarea.value = getGreetingForDate(dateStr, specialTypeKey);
          viewArea.style.display = 'none';
          btnEditTrigger.style.display = 'none';
          editArea.style.display = 'block';
          setTimeout(() => textarea.focus(), 100);
        });

        btnCancel.addEventListener('click', () => {
          editArea.style.display = 'none';
          viewArea.style.display = 'block';
          btnEditTrigger.style.display = 'flex';
        });

        btnReset.addEventListener('click', async () => {
          const defaultText = await resetCustomGreetingForDate(dateStr, specialTypeKey);
          textarea.value = defaultText;
          viewArea.innerHTML = defaultText
            ? escapeHtml(defaultText)
            : '<span style="opacity: 0.6; font-style: italic; font-size: 0.85rem;">(ไม่มีข้อความคำอวยพรของรอบนี้ - กดรูปปากกา ✏️ เพื่อเขียนได้นะคะ)</span>';
          editArea.style.display = 'none';
          viewArea.style.display = 'block';
          btnEditTrigger.style.display = 'flex';
        });

        btnSave.addEventListener('click', async () => {
          const newText = textarea.value.trim();
          await saveCustomGreetingForDate(dateStr, newText);
          viewArea.innerHTML = newText
            ? escapeHtml(newText)
            : '<span style="opacity: 0.6; font-style: italic; font-size: 0.85rem;">(ไม่มีข้อความคำอวยพรของรอบนี้ - กดรูปปากกา ✏️ เพื่อเขียนได้นะคะ)</span>';
          editArea.style.display = 'none';
          viewArea.style.display = 'block';
          btnEditTrigger.style.display = 'flex';
          if (newText) {
            spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 20);
          }
        });
      }
    }

    // 2. Render Existing Entries for this Date
    renderModalEntriesForDate(dateStr);

    // 3. Render Photos taken on this Date (if any)
    renderModalPhotosForDate(dateStr);

    // 4. Reset Form to New Entry Mode
    resetCalendarEntryForm(dateStr);

    // 5. Open Modal
    calendarModal.classList.add('active');

    if (autoFocusInput && calEntryTitle) {
      setTimeout(() => { calEntryTitle.focus(); }, 200);
    }
  }

  function renderModalEntriesForDate(dateStr) {
    if (!calModalEntriesList) return;
    calModalEntriesList.innerHTML = '';

    const entries = calendarNotes.filter(item => item.date === dateStr);

    if (entries.length === 0) {
      calModalEntriesList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 14px; background: rgba(255,255,255,0.7); border-radius: 12px; font-size: 0.92rem;">
          <p>📝 ยังไม่มีบันทึกสำหรับวันนี้</p>
          <span style="font-size: 0.82rem;">เขียนกิจกรรมหวานๆ หรือสิ่งที่ทำด้วยกันด้านล่างได้เลย 💕</span>
        </div>
      `;
      return;
    }

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'cal-entry-card';
      card.innerHTML = `
        <div class="cal-entry-main">
          <div class="cal-entry-header">
            <span class="cal-entry-emoji">${entry.mood || '💖'}</span>
            <span class="cal-entry-title-text">${escapeHtml(entry.title)}</span>
          </div>
          ${entry.content ? `<div class="cal-entry-desc-text">${escapeHtml(entry.content)}</div>` : ''}
        </div>
        <div class="cal-entry-actions">
          <button type="button" class="cal-entry-btn edit" title="แก้ไขบันทึกนี้">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="cal-entry-btn delete" title="ลบบันทึกนี้">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      // Edit Button
      const editBtn = card.querySelector('.cal-entry-btn.edit');
      editBtn.addEventListener('click', () => {
        startEditCalendarEntry(entry);
      });

      // Delete Button
      const deleteBtn = card.querySelector('.cal-entry-btn.delete');
      deleteBtn.addEventListener('click', async () => {
        await deleteCalendarEntry(entry.id);
      });

      calModalEntriesList.appendChild(card);
    });
  }

  function renderModalPhotosForDate(dateStr) {
    if (!calModalPhotosSection || !calModalPhotosStrip) return;
    calModalPhotosStrip.innerHTML = '';

    const dayPhotos = photos.filter(p => p.date === dateStr);

    if (dayPhotos.length === 0) {
      calModalPhotosSection.style.display = 'none';
      return;
    }

    calModalPhotosSection.style.display = 'block';
    dayPhotos.forEach(photo => {
      const thumb = document.createElement('img');
      thumb.className = 'cal-photo-thumb';
      thumb.src = photo.imageSrc;
      thumb.alt = photo.title || 'ความทรงจำ';
      thumb.title = `${photo.title || 'รูปภาพ'} (คลิกเพื่อดูรูปใหญ่)`;
      thumb.addEventListener('click', () => {
        openLightbox(photo);
      });
      calModalPhotosStrip.appendChild(thumb);
    });
  }

  function resetCalendarEntryForm(dateStr = activeSelectedDate) {
    editingCalendarEntryId = null;
    if (calEntryId) calEntryId.value = '';
    if (calEntryDate) calEntryDate.value = dateStr || '';
    if (calEntryTitle) calEntryTitle.value = '';
    if (calEntryContent) calEntryContent.value = '';

    if (calFormHeading) {
      calFormHeading.innerHTML = '<i class="fa-solid fa-pen-fancy" style="color: var(--primary);"></i> เขียนบันทึกใหม่:';
    }
    if (calSubmitBtn) {
      calSubmitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> บันทึกลง Supabase';
    }
    if (calCancelEditBtn) {
      calCancelEditBtn.style.display = 'none';
    }

    // Reset default mood
    activeSelectedMood = '💖';
    activeSelectedCategory = 'date';
    moodChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.mood === '💖');
    });
  }

  function startEditCalendarEntry(entry) {
    editingCalendarEntryId = entry.id;
    if (calEntryId) calEntryId.value = entry.id;
    if (calEntryDate) calEntryDate.value = entry.date;
    if (calEntryTitle) {
      calEntryTitle.value = entry.title || '';
      calEntryTitle.focus();
    }
    if (calEntryContent) calEntryContent.value = entry.content || '';

    activeSelectedMood = entry.mood || '💖';
    activeSelectedCategory = entry.category || 'date';

    moodChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.mood === activeSelectedMood);
    });

    if (calFormHeading) {
      calFormHeading.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--primary);"></i> แก้ไขบันทึก:';
    }
    if (calSubmitBtn) {
      calSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> บันทึกการแก้ไข';
    }
    if (calCancelEditBtn) {
      calCancelEditBtn.style.display = 'inline-block';
    }

    // Scroll form into view inside modal
    const calFormSection = document.querySelector('.cal-modal-form-section');
    if (calFormSection) {
      calFormSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Mood selector chip clicks
  moodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      moodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeSelectedMood = chip.dataset.mood || '💖';
      activeSelectedCategory = chip.dataset.cat || 'date';
    });
  });

  // Cancel edit button
  if (calCancelEditBtn) {
    calCancelEditBtn.addEventListener('click', () => {
      resetCalendarEntryForm(activeSelectedDate);
    });
  }

  // Calendar Entry Form Submit
  if (calendarEntryForm) {
    calendarEntryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (calEntryTitle ? calEntryTitle.value.trim() : '');
      const content = (calEntryContent ? calEntryContent.value.trim() : '');
      const targetDate = (calEntryDate && calEntryDate.value) ? calEntryDate.value : activeSelectedDate;

      if (!title) {
        alert('กรุณาระบุว่าวันนี้ทำอะไรด้วยนะครับ 💕');
        return;
      }

      if (editingCalendarEntryId) {
        // UPDATE EXISTING ENTRY
        const idx = calendarNotes.findIndex(c => c.id === editingCalendarEntryId);
        if (idx !== -1) {
          calendarNotes[idx] = {
            ...calendarNotes[idx],
            title: title,
            content: content,
            mood: activeSelectedMood,
            category: activeSelectedCategory,
            updatedAt: Date.now()
          };
        }
        showToast('อัปเดตบันทึกเรียบร้อยแล้ว ✨', 'success');
      } else {
        // CREATE NEW ENTRY
        const newEntry = {
          id: 'cal-' + Date.now(),
          date: targetDate,
          title: title,
          content: content,
          mood: activeSelectedMood,
          category: activeSelectedCategory,
          updatedAt: Date.now()
        };
        calendarNotes.unshift(newEntry);
        showToast('เพิ่มบันทึกกิจกรรมเรียบร้อยแล้ว 💕', 'success');
      }

      // Re-render UI
      renderCalendar();
      renderModalEntriesForDate(targetDate);
      resetCalendarEntryForm(targetDate);

      // Heart burst
      spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 20);

      // Save to Supabase Cloud & LocalStorage
      await saveCalendarNotes();
    });
  }

  async function deleteCalendarEntry(id) {
    if (!deletedCalendarIds.includes(id)) {
      deletedCalendarIds.push(id);
      try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch (e) { }
    }

    calendarNotes = calendarNotes.filter(item => item.id !== id);

    // Delete from Supabase love_calendar table
    if (supabase) {
      try {
        await supabase.from('love_calendar').delete().eq('id', String(id));
      } catch (err) {
        console.warn('Supabase delete calendar entry error:', err);
      }
    }

    renderCalendar();
    if (activeSelectedDate) {
      renderModalEntriesForDate(activeSelectedDate);
    }
    await saveCalendarNotes();
    showToast('ลบบันทึกเรียบร้อยแล้ว 🗑️', 'info');
  }

  // Close calendar modal handlers
  if (closeCalendarModal) {
    closeCalendarModal.addEventListener('click', () => {
      if (calendarModal) calendarModal.classList.remove('active');
    });
  }

  // Month Navigation Buttons
  if (calPrevBtn) {
    calPrevBtn.addEventListener('click', () => {
      currentCalMonth--;
      if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
      }
      renderCalendar();
    });
  }

  if (calNextBtn) {
    calNextBtn.addEventListener('click', () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      renderCalendar();
    });
  }

  if (calTodayBtn) {
    calTodayBtn.addEventListener('click', () => {
      const today = new Date();
      currentCalYear = today.getFullYear();
      currentCalMonth = today.getMonth();
      renderCalendar();
      showToast('กลับมายังเดือนปัจจุบันแล้ว 📅', 'info');
    });
  }

  if (calAddEntryBtn) {
    calAddEntryBtn.addEventListener('click', () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      openCalendarDayModal(todayStr, true);
    });
  }

  // ==========================================================================
  // 5. BUCKET LIST & NAVIGATION
  // ==========================================================================

  function renderBucketList() {
    bucketListContainer.innerHTML = '';

    if (bucketList.length === 0) {
      bucketListContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">ยังไม่มีรายการในบักเก็ตลิสต์ กดปุ่ม "+" ด้านบนเพื่อเพิ่มได้เลยครับ 💕</p>`;
      return;
    }

    bucketList.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = `bucket-item ${item.completed ? 'completed' : ''}`;
      el.innerHTML = `
        <input type="checkbox" class="bucket-checkbox" ${item.completed ? 'checked' : ''}>
        <span class="bucket-text">${escapeHtml(item.text)}</span>
        <button class="action-btn delete-bucket" style="width: 26px; height: 26px; font-size: 0.75rem;" title="ลบรายการนี้">&times;</button>
      `;

      const chk = el.querySelector('.bucket-checkbox');
      chk.addEventListener('change', () => {
        bucketList[index].completed = chk.checked;
        renderBucketList();
        saveBucketList();
      });

      const delBtn = el.querySelector('.delete-bucket');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemToDelete = bucketList[index];
        if (itemToDelete) {
          const targetId = itemToDelete.id;
          if (!deletedBucketIds.includes(targetId)) {
            deletedBucketIds.push(targetId);
            try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch (e) { }
          }
          if (supabase) {
            try {
              await supabase.from('love_bucket').delete().eq('id', String(targetId));
            } catch (err) {
              console.warn('Supabase delete bucket item error:', err);
            }
          }
        }
        bucketList.splice(index, 1);
        renderBucketList();
        await saveBucketList();
        showToast('ลบรายการบักเก็ตลิสต์เรียบร้อยแล้ว 🗑️', 'info');
      });

      bucketListContainer.appendChild(el);
    });
    updateYouMeStats();
  }

  // Bucket List Modal Elements
  const bucketModal = document.getElementById('bucket-modal');
  const closeBucketModal = document.getElementById('close-bucket-modal');
  const bucketForm = document.getElementById('bucket-form');
  const bucketTextInput = document.getElementById('bucket-text-input');

  addBucketBtn.addEventListener('click', () => {
    if (bucketModal) {
      bucketModal.classList.add('active');
      if (bucketTextInput) bucketTextInput.focus();
    } else {
      const text = prompt('ใส่กิจกรรมน่ารักๆ ที่อยากทำด้วยกัน 💖:');
      if (text && text.trim()) {
        bucketList.push({ id: 'b-' + Date.now(), text: text.trim(), completed: false });
        renderBucketList();
        saveBucketList();
      }
    }
  });

  if (closeBucketModal) {
    closeBucketModal.addEventListener('click', () => {
      bucketModal.classList.remove('active');
      if (bucketForm) bucketForm.reset();
    });
  }

  if (bucketForm) {
    bucketForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = bucketTextInput.value.trim();
      if (text) {
        bucketList.push({ id: 'b-' + Date.now(), text: text, completed: false });
        renderBucketList();
        saveBucketList();
        bucketModal.classList.remove('active');
        bucketForm.reset();
        spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 15);
      }
    });
  }

  // Navigation tab switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(tab.dataset.tab);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // You & Me Dashboard Stats & Interactions
  function updateYouMeStats() {
    const statPhotos = document.getElementById('stat-photos-count');
    const statCal = document.getElementById('stat-calendar-count');
    const statBucket = document.getElementById('stat-bucket-count');

    if (statPhotos) statPhotos.textContent = photos.length;
    if (statCal) statCal.textContent = calendarNotes.length;
    if (statBucket) {
      const done = bucketList.filter(b => b.completed).length;
      statBucket.textContent = `${done}/${bucketList.length}`;
    }
    const statTimer = document.getElementById('stat-timer-status');
    if (statTimer) {
      if (activeTimerState && !activeTimerState.isPaused) {
        statTimer.textContent = 'กำลังจับเวลา';
        statTimer.style.color = 'var(--primary)';
      } else if (activeTimerState && activeTimerState.isPaused) {
        statTimer.textContent = 'พักชั่วคราว';
        statTimer.style.color = '#ff9800';
      } else {
        statTimer.textContent = 'พร้อมใช้';
        statTimer.style.color = '#2e7d32';
      }
    }
    renderSpecialAnnualDates();
  }

  document.querySelectorAll('.youme-stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const targetTabId = card.dataset.goto;
      const targetTabBtn = document.querySelector(`.nav-tab[data-tab="${targetTabId}"]`);
      if (targetTabBtn) {
        targetTabBtn.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  const sendLoveHeartBtn = document.getElementById('send-love-heart-btn');
  if (sendLoveHeartBtn) {
    sendLoveHeartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 40);
      showToast('ส่งหัวใจความรักไปให้เธอแล้วนะคะ 💕', 'success');
    });
  }

  // Close modals when clicking overlay
  const timerAlertModalEl = document.getElementById('timer-alert-modal');
  [uploadModal, lightboxModal, bucketModal, calendarModal, timerAlertModalEl].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  });

  // ==========================================================================
  // 6. TIMER & DISCORD REMINDER SYSTEM LOGIC (TAB 4)
  // ==========================================================================
  const DISCORD_TIMER_WEBHOOK = 'https://discord.com/api/webhooks/1542138463946543157/UM5j3hKjDxH4pKbzDSXEOnFLGu_jGSD371bok3lP3ruYmUbZ50Di4GPJsmtQax7qxHST';

  let activeTimerState = null;
  let timerInterval = null;
  let lastFinishedTimerData = null;

  let timerHistory = [];
  try {
    const rawTH = localStorage.getItem('love_timer_history');
    if (rawTH) timerHistory = JSON.parse(rawTH) || [];
  } catch (e) { }

  function getMentionDetails(targetVal) {
    if (targetVal === 'fresh' || targetVal === '1198602938109657199') {
      return {
        id: '1198602938109657199',
        tagText: '<@1198602938109657199>',
        label: '💖 เฟรช (<@1198602938109657199>)',
        displayTag: '💖 เฟรช'
      };
    }
    if (targetVal === 'best' || targetVal === '604625807687680020') {
      return {
        id: '604625807687680020',
        tagText: '<@604625807687680020>',
        label: '🐱 เบส (<@604625807687680020>)',
        displayTag: '🐱 เบส'
      };
    }
    if (targetVal === 'both' || targetVal === 'everyone' || targetVal === '@everyone') {
      return {
        id: 'everyone',
        tagText: '@everyone',
        label: '👥 ทั้งคู่ (@everyone)',
        displayTag: '👥 ทั้งคู่ (@everyone)'
      };
    }
    return {
      id: 'none',
      tagText: '',
      label: '🔕 ไม่ได้แท็กใคร',
      displayTag: '🔕 ไม่แท็กใคร'
    };
  }

  function formatDurationLabel(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} ชั่วโมง`);
    if (mins > 0) parts.push(`${mins} นาที`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} วินาที`);
    return parts.join(' ');
  }

  function formatTimeDigits(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const pad = (n) => n < 10 ? '0' + n : String(n);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  function playSweetTimerChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      // 4 Sweet ascending melodic bell notes (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const nowTime = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const start = nowTime + idx * 0.18;
        const dur = 1.3;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const oscH = ctx.createOscillator();
        const gainH = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        oscH.type = 'triangle';
        oscH.frequency.setValueAtTime(freq * 2.76, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.32, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        gainH.gain.setValueAtTime(0, start);
        gainH.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gainH.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        oscH.connect(gainH);
        gainH.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);

        oscH.start(start);
        oscH.stop(start + dur);
      });
    } catch (err) {
      console.warn('Audio chime error:', err);
    }
  }

  async function sendTimerDiscordAlert(timerData) {
    const mention = getMentionDetails(timerData.mentionTarget);
    const durationLabel = formatDurationLabel(timerData.totalSeconds);
    const device = getDeviceInfo();

    const payload = {
      message: timerData.message,
      mentionTarget: timerData.mentionTarget,
      durationLabel: durationLabel,
      startTime: timerData.startTimeStr,
      endTime: timerData.endTimeStr,
      userAgent: navigator.userAgent,
      presetName: timerData.presetName || ''
    };

    let sent = false;
    try {
      const res = await fetch('/api/timer-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) sent = true;
    } catch (e) {
      console.warn('/api/timer-alert fallback to direct webhook:', e);
    }

    if (!sent) {
      try {
        const embed = {
          title: '⏰ ‧₊˚ ถึงเวลาที่ตั้งไว้แล้วนะคะ! ˚₊‧ 💕',
          description: `# 💌 ${timerData.message || 'ครบเวลาที่ตั้งไว้แล้วค่ะ!'}`,
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
          content: mention.tagText ? `${mention.tagText} ⏰ **${timerData.message || 'ถึงเวลาที่ตั้งไว้แล้วค่ะ!'}**` : `⏰ **${timerData.message || 'ถึงเวลาที่ตั้งไว้แล้วค่ะ!'}**`,
          embeds: [embed]
        };

        await fetch(DISCORD_TIMER_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload)
        });
      } catch (err) {
        console.warn('Direct Discord Timer Webhook error:', err);
      }
    }
  }

  function formatMiniPill(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const pad = (n) => n < 10 ? '0' + n : String(n);
    if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  }

  function initTimerSystem() {
    // Floating FAB & Quick Panel Elements
    const floatingTimerFab = document.getElementById('floating-timer-fab');
    const floatingTimerPanel = document.getElementById('floating-timer-panel');
    const fabMiniPill = document.getElementById('fab-mini-pill');
    const floatRunningView = document.getElementById('float-running-view');
    const floatSetupView = document.getElementById('float-setup-view');
    const floatDigits = document.getElementById('float-digits');
    const floatProgressBar = document.getElementById('float-progress-bar');
    const floatActiveMsg = document.getElementById('float-active-msg');
    const floatActiveTarget = document.getElementById('float-active-target');
    const floatRunningStatusText = document.getElementById('float-running-status-text');
    const floatPauseBtn = document.getElementById('float-pause-btn');
    const floatCancelBtn = document.getElementById('float-cancel-btn');
    const floatStartBtn = document.getElementById('float-start-btn');
    const floatMentionSelect = document.getElementById('float-mention-select');
    const floatMessageInput = document.getElementById('float-message-input');
    const floatPresetChips = document.querySelectorAll('.float-preset-chip');
    const floatCustomHrs = document.getElementById('float-custom-hrs');
    const floatCustomMins = document.getElementById('float-custom-mins');
    const floatClosePanelBtn = document.getElementById('float-close-panel-btn');

    // Floating Mode Switcher & Clock Inputs
    const floatTabCountdown = document.getElementById('float-tab-countdown');
    const floatTabClock = document.getElementById('float-tab-clock');
    const floatModeCountdownSection = document.getElementById('float-mode-countdown-section');
    const floatModeClockSection = document.getElementById('float-mode-clock-section');
    const floatTargetClockInput = document.getElementById('float-target-clock-input');
    const floatClockPreviewHint = document.getElementById('float-clock-preview-hint');
    const floatCountdownEndPreview = document.getElementById('float-countdown-end-preview');

    let currentTimerMode = 'countdown'; // 'countdown' or 'clock'

    // Alert Modal Elements
    const timerAlertModal = document.getElementById('timer-alert-modal');
    const closeTimerModalBtn = document.getElementById('close-timer-modal-btn');
    const rerunFinishedTimerBtn = document.getElementById('rerun-finished-timer-btn');
    const modalFinishedMessage = document.getElementById('modal-finished-message');
    const modalFinishedTarget = document.getElementById('modal-finished-target');
    const modalFinishedDuration = document.getElementById('modal-finished-duration');

    let floatSelectedSecs = 300; // Default 5 minutes

    // --- 1. Cloud Active Timer Sync & QStash Scheduler Helper ---
    const QSTASH_PUBLISH_URL = 'https://qstash-eu-central-1.upstash.io/v2/publish/';
    const QSTASH_TOKEN = 'eyJVc2VySUQiOiJiYTc2NWUzMS1kNDY1LTQ1OTgtOTNhZC1jZTJmZDY4ZTY2YWIiLCJQYXNzd29yZCI6IjllOTM3YWVhMzcwZjRhMzZiMjA0MDVjNzI0YjhkM2I1In0=';

    async function scheduleCloudTimerWithQStash(timerData) {
      try {
        const res = await fetch('/api/schedule-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'schedule',
            totalSeconds: timerData.totalSeconds,
            message: timerData.message,
            mentionTarget: timerData.mentionTarget,
            startTimeStr: timerData.startTimeStr,
            endTimeStr: timerData.endTimeStr,
            timerToken: timerData.timerToken,
            presetName: timerData.presetName
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.messageId) {
            timerData.qstashMessageId = json.messageId;
            try { localStorage.setItem('love_active_timer', JSON.stringify(timerData)); } catch (e) { }
            saveActiveTimerToCloud(timerData);
          }
          return;
        }
      } catch (err) {
        console.warn('Vercel schedule-timer fallback:', err);
      }

      // Client Fallback: Always Route Through Verification Endpoint to Prevent Old/Paused Alerts
      try {
        const qstashPayload = {
          action: 'execute',
          timerToken: timerData.timerToken,
          totalSeconds: timerData.totalSeconds,
          message: timerData.message,
          mentionTarget: timerData.mentionTarget,
          startTimeStr: timerData.startTimeStr,
          endTimeStr: timerData.endTimeStr,
          presetName: timerData.presetName
        };

        const targetEndpoint = 'https://fedmaiyuu.vercel.app/api/schedule-timer';
        const qRes = await fetch(`${QSTASH_PUBLISH_URL}${targetEndpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${QSTASH_TOKEN}`,
            'Content-Type': 'application/json',
            'Upstash-Delay': `${timerData.totalSeconds}s`,
            'Upstash-Retries': '3'
          },
          body: JSON.stringify(qstashPayload)
        });

        if (qRes.ok) {
          const qJson = await qRes.json();
          if (qJson.messageId) {
            timerData.qstashMessageId = qJson.messageId;
            try { localStorage.setItem('love_active_timer', JSON.stringify(timerData)); } catch (e) { }
            saveActiveTimerToCloud(timerData);
          }
        }
      } catch (e) {
        console.warn('Direct QStash error:', e);
      }
    }

    async function cancelCloudTimerWithQStash(messageId) {
      if (!messageId) return;
      try {
        await fetch('/api/schedule-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', messageId: messageId })
        });
      } catch (e) { }

      try {
        await fetch(`https://qstash-eu-central-1.upstash.io/v2/messages/${encodeURIComponent(messageId)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${QSTASH_TOKEN}`
          }
        });
      } catch (e) { }
    }

    async function saveActiveTimerToCloud(state) {
      try {
        if (supabase) {
          const { data: rows } = await supabase.from('love_data').select('data').eq('id', 'shared_app_data');
          let currentData = {};
          if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            currentData = rows[0].data;
          }
          currentData.activeTimer = state ? { ...state, isSent: false } : null;
          await supabase.from('love_data').upsert({
            id: 'shared_app_data',
            data: currentData,
            updated_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('Cloud activeTimer save error:', err);
      }
    }

    window.handleCloudTimerSync = function (cloudTimer) {
      if (cloudTimer && !cloudTimer.isSent && !cloudTimer.isPaused) {
        const now = Date.now();
        if (now < cloudTimer.targetEndTime) {
          if (!activeTimerState || activeTimerState.id !== cloudTimer.id || Math.abs(activeTimerState.targetEndTime - cloudTimer.targetEndTime) > 2000) {
            activeTimerState = cloudTimer;
            try { localStorage.setItem('love_active_timer', JSON.stringify(activeTimerState)); } catch (e) { }
            renderActiveTimerUI();
            startTimerTicker();
          }
        }
      } else if (!cloudTimer && activeTimerState) {
        activeTimerState = null;
        try { localStorage.removeItem('love_active_timer'); } catch (e) { }
        renderActiveTimerUI();
      }
    };

    // --- 2. Floating FAB & Panel Event Handlers ---
    if (floatingTimerFab) {
      floatingTimerFab.addEventListener('click', (e) => {
        e.stopPropagation();
        if (floatingTimerPanel) {
          const isOpen = floatingTimerPanel.classList.contains('active');
          if (isOpen) {
            floatingTimerPanel.classList.remove('active');
            floatingTimerFab.classList.remove('panel-open');
          } else {
            floatingTimerPanel.classList.add('active');
            floatingTimerFab.classList.add('panel-open');
            if (currentTimerMode === 'clock') {
              initDefaultTargetClock();
            } else {
              updateCountdownEndPreview();
            }
          }
        }
      });
    }

    if (floatClosePanelBtn) {
      floatClosePanelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (floatingTimerPanel) floatingTimerPanel.classList.remove('active');
        if (floatingTimerFab) floatingTimerFab.classList.remove('panel-open');
      });
    }

    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('floating-timer-wrapper');
      if (wrapper && !wrapper.contains(e.target) && floatingTimerPanel && floatingTimerPanel.classList.contains('active')) {
        floatingTimerPanel.classList.remove('active');
        if (floatingTimerFab) floatingTimerFab.classList.remove('panel-open');
      }
    });

    // --- Mode Tabs Switching (Countdown vs Clock) ---
    function updateClockHint() {
      if (!floatTargetClockInput || !floatClockPreviewHint) return;
      const val = floatTargetClockInput.value;
      if (!val) {
        floatClockPreviewHint.textContent = '⏰ กรุณาเลือกเวลาที่ต้องการให้เตือน';
        return;
      }
      const [hStr, mStr] = val.split(':');
      const targetH = parseInt(hStr, 10);
      const targetM = parseInt(mStr, 10);

      const now = new Date();
      const targetDate = new Date();
      targetDate.setHours(targetH, targetM, 0, 0);

      // If target time is already in past today, it's for tomorrow
      let isTomorrow = false;
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
        isTomorrow = true;
      }

      const diffSecs = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / 1000));
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);

      let remainStr = '';
      if (hrs > 0 && mins > 0) remainStr = `อีก ${hrs} ชม. ${mins} นาที`;
      else if (hrs > 0) remainStr = `อีก ${hrs} ชั่วโมง`;
      else remainStr = `อีก ${mins || 1} นาที`;

      const dayPrefix = isTomorrow ? 'พรุ่งนี้ ' : '';
      floatClockPreviewHint.innerHTML = `⏰ จะแจ้งเตือนเวลา <b>${dayPrefix}${val} น.</b> (${remainStr})`;
    }

    function initDefaultTargetClock() {
      if (floatTargetClockInput && !floatTargetClockInput.value) {
        const d = new Date(Date.now() + 10 * 60 * 1000);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        floatTargetClockInput.value = `${hh}:${mm}`;
      }
      updateClockHint();
    }

    if (floatTabCountdown && floatTabClock) {
      floatTabCountdown.addEventListener('click', (e) => {
        e.stopPropagation();
        currentTimerMode = 'countdown';
        floatTabCountdown.classList.add('active');
        floatTabClock.classList.remove('active');
        if (floatModeCountdownSection) floatModeCountdownSection.style.display = 'block';
        if (floatModeClockSection) floatModeClockSection.style.display = 'none';
      });

      floatTabClock.addEventListener('click', (e) => {
        e.stopPropagation();
        currentTimerMode = 'clock';
        floatTabClock.classList.add('active');
        floatTabCountdown.classList.remove('active');
        if (floatModeClockSection) floatModeClockSection.style.display = 'block';
        if (floatModeCountdownSection) floatModeCountdownSection.style.display = 'none';
        initDefaultTargetClock();
      });
    }

    if (floatTargetClockInput) {
      floatTargetClockInput.addEventListener('input', updateClockHint);
      floatTargetClockInput.addEventListener('change', updateClockHint);
    }

    function updateCountdownEndPreview() {
      if (!floatCountdownEndPreview) return;
      const now = new Date();
      const targetDate = new Date(now.getTime() + floatSelectedSecs * 1000);
      const hh = String(targetDate.getHours()).padStart(2, '0');
      const mm = String(targetDate.getMinutes()).padStart(2, '0');
      floatCountdownEndPreview.innerHTML = `🔔 จะจับเวลาถึง <b>${hh}:${mm} น.</b> (${formatDurationLabel(floatSelectedSecs)})`;
    }

    function updateCountdownSecsFromInputs() {
      const h = parseInt(floatCustomHrs ? floatCustomHrs.value : '0', 10) || 0;
      const m = parseInt(floatCustomMins ? floatCustomMins.value : '0', 10) || 0;
      floatSelectedSecs = Math.max(1, h * 3600 + m * 60);
      updateCountdownEndPreview();
    }

    // Preset Chips
    floatPresetChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        floatPresetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        floatSelectedSecs = parseInt(chip.dataset.secs, 10);
        const h = Math.floor(floatSelectedSecs / 3600);
        const m = Math.floor((floatSelectedSecs % 3600) / 60);
        if (floatCustomHrs) floatCustomHrs.value = h;
        if (floatCustomMins) floatCustomMins.value = m;
        updateCountdownEndPreview();
      });
    });

    // Custom Hours & Minutes Input
    if (floatCustomHrs) {
      floatCustomHrs.addEventListener('input', () => {
        floatPresetChips.forEach(c => c.classList.remove('active'));
        updateCountdownSecsFromInputs();
      });
    }

    if (floatCustomMins) {
      floatCustomMins.addEventListener('input', () => {
        floatPresetChips.forEach(c => c.classList.remove('active'));
        updateCountdownSecsFromInputs();
      });
    }

    // Initial countdown preview
    updateCountdownEndPreview();

    // Floating Start Button
    if (floatStartBtn) {
      floatStartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msg = floatMessageInput ? floatMessageInput.value.trim() : 'ต้มมาม่าเสร็จแล้วน้าา 🍜';
        const mention = floatMentionSelect ? floatMentionSelect.value : 'none';

        let targetSecs = floatSelectedSecs;
        let presetLabel = formatDurationLabel(floatSelectedSecs);

        if (currentTimerMode === 'clock') {
          if (!floatTargetClockInput || !floatTargetClockInput.value) {
            showToast('กรุณาระบุเวลาที่ต้องการให้เตือนด้วยครับ', 'error');
            return;
          }
          const [hStr, mStr] = floatTargetClockInput.value.split(':');
          const targetH = parseInt(hStr, 10);
          const targetM = parseInt(mStr, 10);

          const now = new Date();
          const targetDate = new Date();
          targetDate.setHours(targetH, targetM, 0, 0);

          if (targetDate.getTime() <= now.getTime()) {
            targetDate.setDate(targetDate.getDate() + 1);
          }

          targetSecs = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / 1000));
          presetLabel = `เวลา ${floatTargetClockInput.value} น.`;
        } else {
          updateCountdownSecsFromInputs();
          targetSecs = floatSelectedSecs;
          presetLabel = formatDurationLabel(targetSecs);
        }

        startNewTimer({
          totalSeconds: targetSecs,
          message: msg,
          mentionTarget: mention,
          presetName: presetLabel
        });
      });
    }

    // Floating Running Action Buttons
    if (floatPauseBtn) {
      floatPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!activeTimerState) return;

        if (activeTimerState.isPaused) {
          activeTimerState.isPaused = false;
          activeTimerState.targetEndTime = Date.now() + activeTimerState.pausedRemaining * 1000;
          const endD = new Date(activeTimerState.targetEndTime);
          activeTimerState.endTimeStr = endD.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          // Re-schedule with new token so old timer alert is discarded
          const newToken = 'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          activeTimerState.timerToken = newToken;

          if (activeTimerState.qstashMessageId) {
            cancelCloudTimerWithQStash(activeTimerState.qstashMessageId);
          }
          scheduleCloudTimerWithQStash({
            ...activeTimerState,
            totalSeconds: activeTimerState.pausedRemaining
          });

          showToast('จับเวลานับต่อแล้ว ⏱️', 'info');
        } else {
          const diffMs = activeTimerState.targetEndTime - Date.now();
          activeTimerState.pausedRemaining = Math.max(0, Math.ceil(diffMs / 1000));
          activeTimerState.isPaused = true;

          // Cancel QStash while paused
          if (activeTimerState.qstashMessageId) {
            cancelCloudTimerWithQStash(activeTimerState.qstashMessageId);
            activeTimerState.qstashMessageId = null;
          }

          showToast('พักการจับเวลาชั่วคราว ⏸️', 'info');
        }

        try { localStorage.setItem('love_active_timer', JSON.stringify(activeTimerState)); } catch (e) { }
        saveActiveTimerToCloud(activeTimerState);
        renderActiveTimerUI();
      });
    }



    if (floatCancelBtn) {
      floatCancelBtn.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        if (timerInterval) clearInterval(timerInterval);
        if (activeTimerState && activeTimerState.qstashMessageId) {
          cancelCloudTimerWithQStash(activeTimerState.qstashMessageId);
        }
        activeTimerState = null;
        try { localStorage.removeItem('love_active_timer'); } catch (err) { }
        saveActiveTimerToCloud(null);
        renderActiveTimerUI();
        showToast('ยกเลิกการจับเวลาเรียบร้อยแล้ว ❌', 'info');
      });
    }

    // --- 3. Start New Timer ---
    function startNewTimer({ totalSeconds, message, mentionTarget, presetName }) {
      if (totalSeconds <= 0) {
        showToast('กรุณาระบุระยะเวลาจับเวลาที่มากกว่า 0 วินาทีครับ', 'error');
        return;
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + totalSeconds * 1000);

      const timeFormatOptions = {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };

      const startTimeStr = now.toLocaleTimeString('th-TH', timeFormatOptions);
      const endTimeStr = endTime.toLocaleTimeString('th-TH', timeFormatOptions);

      const timerToken = 'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

      activeTimerState = {
        id: 'timer-' + Date.now(),
        timerToken: timerToken,
        totalSeconds: totalSeconds,
        targetEndTime: endTime.getTime(),
        startTimeStr: startTimeStr,
        endTimeStr: endTimeStr,
        message: message || 'ครบเวลาที่ตั้งไว้แล้วค่ะ! 💕',
        mentionTarget: mentionTarget || 'none',
        presetName: presetName || '',
        isPaused: false,
        isSent: false,
        pausedRemaining: totalSeconds,
        qstashMessageId: null
      };

      try {
        localStorage.setItem('love_active_timer', JSON.stringify(activeTimerState));
      } catch (e) { }

      // Schedule on Upstash Cloud Queue (Exact to the second, works even if web is closed!)
      scheduleCloudTimerWithQStash(activeTimerState);

      // Save to Supabase Cloud Database for cross-device sync
      saveActiveTimerToCloud(activeTimerState);

      renderActiveTimerUI();
      startTimerTicker();

      spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 20);
      showToast(`เริ่มจับเวลา ${formatDurationLabel(totalSeconds)} ซิงก์ขึ้น Cloud แล้ว ⏱️☁️`, 'success');
    }

    // --- 4. Render Active Timer UI ---
    function renderActiveTimerUI() {
      if (!activeTimerState) {
        if (floatingTimerFab) floatingTimerFab.classList.remove('running');
        if (fabMiniPill) fabMiniPill.style.display = 'none';
        if (floatRunningView) floatRunningView.style.display = 'none';
        if (floatSetupView) floatSetupView.style.display = 'block';
        return;
      }

      // Floating Widget running state
      if (floatingTimerFab) floatingTimerFab.classList.add('running');
      if (fabMiniPill) fabMiniPill.style.display = 'inline-block';
      if (floatRunningView) floatRunningView.style.display = 'block';
      if (floatSetupView) floatSetupView.style.display = 'none';

      const mention = getMentionDetails(activeTimerState.mentionTarget);
      if (floatActiveMsg) floatActiveMsg.textContent = activeTimerState.message;
      if (floatActiveTarget) floatActiveTarget.innerHTML = `${mention.displayTag}`;

      if (activeTimerState.isPaused) {
        if (floatRunningStatusText) floatRunningStatusText.textContent = '⏸️ พักชั่วคราว';
        if (floatPauseBtn) floatPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> นับต่อ';
        if (floatDigits) floatDigits.textContent = formatTimeDigits(activeTimerState.pausedRemaining);
        if (fabMiniPill) fabMiniPill.textContent = formatMiniPill(activeTimerState.pausedRemaining);
      } else {
        if (floatRunningStatusText) floatRunningStatusText.textContent = 'กำลังจับเวลา...';
        if (floatPauseBtn) floatPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> พัก';
      }
    }

    // --- 5. Timer Ticker Interval ---
    function startTimerTicker() {
      if (timerInterval) clearInterval(timerInterval);

      function tick() {
        if (!activeTimerState) {
          clearInterval(timerInterval);
          return;
        }

        if (activeTimerState.isPaused) {
          const formatted = formatTimeDigits(activeTimerState.pausedRemaining);
          if (floatDigits) floatDigits.textContent = formatted;
          if (fabMiniPill) fabMiniPill.textContent = formatMiniPill(activeTimerState.pausedRemaining);

          const pct = Math.min(100, Math.max(0, (activeTimerState.pausedRemaining / activeTimerState.totalSeconds) * 100));
          if (floatProgressBar) floatProgressBar.style.width = `${pct}%`;
          return;
        }

        const nowMs = Date.now();
        const diffMs = activeTimerState.targetEndTime - nowMs;
        const remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));
        const formatted = formatTimeDigits(remainingSeconds);

        if (floatDigits) floatDigits.textContent = formatted;
        if (fabMiniPill) fabMiniPill.textContent = formatMiniPill(remainingSeconds);

        const pct = Math.min(100, Math.max(0, (remainingSeconds / activeTimerState.totalSeconds) * 100));
        if (floatProgressBar) floatProgressBar.style.width = `${pct}%`;

        if (remainingSeconds <= 0) {
          clearInterval(timerInterval);
          triggerTimerCompletion();
        }
      }

      tick();
      timerInterval = setInterval(tick, 1000);
    }

    // --- 6. Timer Finished Action ---
    async function triggerTimerCompletion() {
      const finishedTimer = activeTimerState ? { ...activeTimerState } : null;
      lastFinishedTimerData = finishedTimer;

      activeTimerState = null;
      try {
        localStorage.removeItem('love_active_timer');
      } catch (e) { }

      // Clear cloud activeTimer
      saveActiveTimerToCloud(null);

      renderActiveTimerUI();

      // Play Sound Chime
      playSweetTimerChime();

      // Spawn Confetti / Hearts Burst
      spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 45);

      if (finishedTimer) {
        // If not scheduled on QStash, send direct webhook fallback
        if (!finishedTimer.qstashMessageId) {
          sendTimerDiscordAlert(finishedTimer);
        }

        // Open Alert Modal
        if (modalFinishedMessage) modalFinishedMessage.textContent = `"${finishedTimer.message}"`;
        const mention = getMentionDetails(finishedTimer.mentionTarget);
        if (modalFinishedTarget) modalFinishedTarget.textContent = `แท็ก: ${mention.displayTag}`;
        if (modalFinishedDuration) modalFinishedDuration.textContent = `ระยะเวลา: ${formatDurationLabel(finishedTimer.totalSeconds)}`;

        if (timerAlertModal) {
          timerAlertModal.classList.add('active');
        }

        showToast(`⏰ หมดเวลาจับเวลาแล้ว: "${finishedTimer.message}"`, 'success', 6000);
      }
    }

    // --- 7. Modal Buttons ---
    if (closeTimerModalBtn) {
      closeTimerModalBtn.addEventListener('click', () => {
        if (timerAlertModal) timerAlertModal.classList.remove('active');
      });
    }

    if (rerunFinishedTimerBtn) {
      rerunFinishedTimerBtn.addEventListener('click', () => {
        if (timerAlertModal) timerAlertModal.classList.remove('active');
        if (lastFinishedTimerData) {
          startNewTimer({
            totalSeconds: lastFinishedTimerData.totalSeconds,
            message: lastFinishedTimerData.message,
            mentionTarget: lastFinishedTimerData.mentionTarget,
            presetName: lastFinishedTimerData.presetName
          });
        }
      });
    }

    // --- 8. Restore Active Timer from LocalStorage on page load ---
    try {
      const savedTimer = localStorage.getItem('love_active_timer');
      if (savedTimer) {
        const parsed = JSON.parse(savedTimer);
        if (parsed && parsed.targetEndTime) {
          if (parsed.isPaused) {
            activeTimerState = parsed;
            renderActiveTimerUI();
            startTimerTicker();
          } else {
            const now = Date.now();
            if (now < parsed.targetEndTime) {
              activeTimerState = parsed;
              renderActiveTimerUI();
              startTimerTicker();
            } else {
              triggerTimerCompletion();
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error restoring active timer:', e);
    }
  }

  // ==========================================================================
  // 7. FLOATING HEARTS BACKGROUND CANVAS & INTERACTIVE BURST
  // ==========================================================================
  const canvas = document.getElementById('hearts-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function initHeartsCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    for (let i = 0; i < 25; i++) {
      particles.push(createHeartParticle(false));
    }

    requestAnimationFrame(renderHearts);
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createHeartParticle(isBurst = false, x = 0, y = 0) {
    return {
      x: isBurst ? x : Math.random() * canvas.width,
      y: isBurst ? y : canvas.height + Math.random() * 100,
      size: Math.random() * 14 + 10,
      speedY: isBurst ? (Math.random() - 0.5) * 6 : - (Math.random() * 1.5 + 0.5),
      speedX: isBurst ? (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 0.8,
      opacity: isBurst ? 1 : Math.random() * 0.5 + 0.3,
      decay: isBurst ? Math.random() * 0.02 + 0.01 : 0,
      color: `hsl(${Math.floor(Math.random() * 40 + 340)}, 100%, 75%)`,
      isBurst: isBurst
    };
  }

  function renderHearts() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.isBurst) {
        p.opacity -= p.decay;
        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }
      } else {
        if (p.y < -30) {
          p.y = canvas.height + 30;
          p.x = Math.random() * canvas.width;
        }
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);

      ctx.beginPath();
      const topCurveHeight = p.size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(0, 0, -p.size / 2, 0, -p.size / 2, topCurveHeight);
      ctx.bezierCurveTo(-p.size / 2, (p.size + topCurveHeight) / 2, 0, p.size, 0, p.size);
      ctx.bezierCurveTo(0, p.size, p.size / 2, (p.size + topCurveHeight) / 2, p.size / 2, topCurveHeight);
      ctx.bezierCurveTo(p.size / 2, 0, 0, 0, 0, topCurveHeight);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(renderHearts);
  }

  function spawnHeartBurst(x, y, count = 15) {
    for (let i = 0; i < count; i++) {
      particles.push(createHeartParticle(true, x, y));
    }
  }

  window.addEventListener('click', (e) => {
    spawnHeartBurst(e.clientX, e.clientY, 8);
  });

  // --- HELPER FUNCTIONS ---
  function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function createCuteCanvasDataUrl(emoji, label, color1, color2) {
    const cvs = document.createElement('canvas');
    cvs.width = 600;
    cvs.height = 450;
    const ctx = cvs.getContext('2d');

    // Linear Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 600, 450);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 450);

    // Decorative White Circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(300, 190, 95, 0, Math.PI * 2);
    ctx.fill();

    // Emoji Icon
    ctx.font = '85px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 300, 190);

    // Label Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(label, 300, 340);

    return cvs.toDataURL('image/png');
  }

  // RUN APP!
  initApp();
});
