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

  // --- PIN LOCK SYSTEM STATE ---
  let enteredPin = '';
  const PIN_LENGTH = 6;
  const VALID_PINS = ['020869',];

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
    initCoupleGPS();

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

  // --- LINE SECURITY NOTIFICATION HELPER ---
  let wrongPinAttempts = 0;
  async function sendWrongPinLineAlert(failedPin) {
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

      const payload = {
        enteredPin: failedPin,
        attemptCount: wrongPinAttempts,
        timestamp: timeString,
        userAgent: navigator.userAgent
      };

      await fetch('/api/line-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('LINE Security Alert send error:', e);
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
      // ERROR: Shake & Feedback + Send LINE Alert Notification
      const failedPinAttempt = enteredPin;
      sendWrongPinLineAlert(failedPinAttempt);

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
    displayAnniversaryDate.innerHTML = `<i class="fa-solid fa-calendar-heart"></i> วันครบรอบ: ${formatted}`;
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
              try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch(e){}
            }
            if (Array.isArray(d.deletedCalendarIds)) {
              d.deletedCalendarIds.forEach(id => { if (!deletedCalendarIds.includes(String(id))) deletedCalendarIds.push(String(id)); });
              try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch(e){}
            }
            if (Array.isArray(d.deletedBucketIds)) {
              d.deletedBucketIds.forEach(id => { if (!deletedBucketIds.includes(String(id))) deletedBucketIds.push(String(id)); });
              try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch(e){}
            }

            if (Array.isArray(d.photos)) cloudPhotos = d.photos;
            if (Array.isArray(d.bucketList)) cloudBucket = d.bucketList;
            if (Array.isArray(d.calendarNotes)) cloudCalendar = d.calendarNotes;

            if (d.locations) {
              let updatedLoc = false;
              if (d.locations.fresh && (!coupleLocations.fresh || (d.locations.fresh.timestamp || 0) > (coupleLocations.fresh.timestamp || 0))) {
                coupleLocations.fresh = d.locations.fresh;
                updatedLoc = true;
              }
              if (d.locations.maiyuu && (!coupleLocations.maiyuu || (d.locations.maiyuu.timestamp || 0) > (coupleLocations.maiyuu.timestamp || 0))) {
                coupleLocations.maiyuu = d.locations.maiyuu;
                updatedLoc = true;
              }
              if (updatedLoc) {
                try { localStorage.setItem('love_locations', JSON.stringify(coupleLocations)); } catch (e) { }
                updateCoupleLocationUI();
              }
            }
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
                try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch(e){}
              }
              if (Array.isArray(d.deletedCalendarIds)) {
                d.deletedCalendarIds.forEach(id => { if (!deletedCalendarIds.includes(String(id))) deletedCalendarIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch(e){}
              }
              if (Array.isArray(d.deletedBucketIds)) {
                d.deletedBucketIds.forEach(id => { if (!deletedBucketIds.includes(String(id))) deletedBucketIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch(e){}
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
                try { localStorage.setItem('love_deleted_photos', JSON.stringify(deletedPhotoIds)); } catch(e){}
              }
              if (Array.isArray(data.deletedCalendarIds)) {
                data.deletedCalendarIds.forEach(id => { if (!deletedCalendarIds.includes(String(id))) deletedCalendarIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_calendar', JSON.stringify(deletedCalendarIds)); } catch(e){}
              }
              if (Array.isArray(data.deletedBucketIds)) {
                data.deletedBucketIds.forEach(id => { if (!deletedBucketIds.includes(String(id))) deletedBucketIds.push(String(id)); });
                try { localStorage.setItem('love_deleted_bucket', JSON.stringify(deletedBucketIds)); } catch(e){}
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
        locations: coupleLocations,
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

      const dayCell = createCalendarDayCell(dayNum, dateStr, true);
      calendarDaysGrid.appendChild(dayCell);
    }

    // 4. Render Current Month Days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = (dateStr === todayStr);
      const isAnniversary = (anniMonthDay && dateStr.endsWith(anniMonthDay));

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

      const dayCell = createCalendarDayCell(nextDay, dateStr, true);
      calendarDaysGrid.appendChild(dayCell);
    }
  }

  function createCalendarDayCell(dayNum, dateStr, isOtherMonth = false, isToday = false, isAnniversary = false) {
    const dayCell = document.createElement('div');
    dayCell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isAnniversary ? 'anniversary-day' : ''}`;
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
    if (isAnniversary) {
      badgesHtml += `<span class="badge-tag badge-anni" title="วันครบรอบของเรา 💕">💖 ครบรอบ</span>`;
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

      if (tab.dataset.tab === 'tab-gps') {
        setTimeout(() => {
          if (!coupleMap) initCoupleMap();
          if (coupleMap) coupleMap.invalidateSize();
          fitCoupleMapBounds();
        }, 150);
      }
    });
  });

  // Close modals when clicking overlay
  [uploadModal, lightboxModal, bucketModal, calendarModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  });

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

  // ==========================================================================
  // 6. COUPLE LIVE GPS & INTERACTIVE DISTANCE MAP
  // ==========================================================================

  let activeGpsRole = localStorage.getItem('love_gps_role') || 'fresh';
  let coupleLocations = {
    fresh: null,
    maiyuu: null
  };

  try {
    const savedLocs = localStorage.getItem('love_locations');
    if (savedLocs) {
      const parsed = JSON.parse(savedLocs);
      if (parsed) coupleLocations = parsed;
    }
  } catch (e) { }

  let coupleMap = null;
  let markerFresh = null;
  let markerMaiyuu = null;
  let markerTogether = null;
  let distanceLine = null;
  let isLiveTracking = false;
  let watchPositionId = null;
  const geocodeCache = {};

  // DOM Elements
  const gpsNameFresh = document.getElementById('gps-name-fresh');
  const gpsPlaceFresh = document.getElementById('gps-place-fresh');
  const gpsTimeFresh = document.getElementById('gps-time-fresh');
  const gpsNameMaiyuu = document.getElementById('gps-name-maiyuu');
  const gpsPlaceMaiyuu = document.getElementById('gps-place-maiyuu');
  const gpsTimeMaiyuu = document.getElementById('gps-time-maiyuu');
  const gpsDistanceDisplay = document.getElementById('gps-distance-display');
  const gpsDistanceStatus = document.getElementById('gps-distance-status');
  const roleBtnFresh = document.getElementById('role-btn-fresh');
  const roleBtnMaiyuu = document.getElementById('role-btn-maiyuu');
  const gpsUpdateBtn = document.getElementById('gps-update-btn');
  const gpsFitBtn = document.getElementById('gps-fit-btn');
  const gpsLiveToggleBtn = document.getElementById('gps-live-toggle-btn');
  const gpsLiveText = document.getElementById('gps-live-text');
  const gpsSyncBadge = document.getElementById('gps-sync-badge');

  function initCoupleGPS() {
    // Setup Role Buttons
    updateRoleButtonUI();

    if (roleBtnFresh) {
      roleBtnFresh.addEventListener('click', () => {
        activeGpsRole = 'fresh';
        localStorage.setItem('love_gps_role', 'fresh');
        updateRoleButtonUI();
        showToast('สลับเป็นโปรไฟล์: Fresh (เค้า) 👨', 'info');
      });
    }

    if (roleBtnMaiyuu) {
      roleBtnMaiyuu.addEventListener('click', () => {
        activeGpsRole = 'maiyuu';
        localStorage.setItem('love_gps_role', 'maiyuu');
        updateRoleButtonUI();
        showToast('สลับเป็นโปรไฟล์: Maiyuu (แฟน) 👩', 'info');
      });
    }

    if (gpsUpdateBtn) {
      gpsUpdateBtn.addEventListener('click', () => {
        updateCurrentLocation(true);
      });
    }

    if (gpsFitBtn) {
      gpsFitBtn.addEventListener('click', () => {
        fitCoupleMapBounds();
      });
    }

    if (gpsLiveToggleBtn) {
      gpsLiveToggleBtn.addEventListener('click', () => {
        toggleLiveTracking();
      });
    }

    // Init Map
    initCoupleMap();
    updateCoupleLocationUI();
  }

  function updateRoleButtonUI() {
    if (roleBtnFresh) roleBtnFresh.classList.toggle('active', activeGpsRole === 'fresh');
    if (roleBtnMaiyuu) roleBtnMaiyuu.classList.toggle('active', activeGpsRole === 'maiyuu');
  }

  function initCoupleMap() {
    const mapContainer = document.getElementById('couple-map');
    if (!mapContainer || coupleMap) return;

    if (typeof L === 'undefined') {
      console.warn('Leaflet library not loaded yet');
      return;
    }

    try {
      coupleMap = L.map('couple-map', {
        zoomControl: true,
        attributionControl: false
      }).setView([13.7563, 100.5018], 11);

      // OpenStreetMap Voyager Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(coupleMap);

      // Render existing markers if available
      updateCoupleLocationUI();
    } catch (err) {
      console.warn('Leaflet map init error:', err);
    }
  }

  // Haversine Distance Formula (km)
  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in kilometers
  }

  async function getThaiPlaceName(lat, lng) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (geocodeCache[key]) return geocodeCache[key];

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, {
        headers: { 'Accept-Language': 'th,en' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const place = addr.suburb || addr.neighbourhood || addr.district || addr.city_district || addr.city || addr.town || addr.province || 'กรุงเทพมหานคร';
          const province = addr.province || addr.state || '';
          const formatted = province && !place.includes(province) ? `${place}, ${province}` : place;
          geocodeCache[key] = formatted;
          return formatted;
        }
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
    }

    return `พิกัด ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return '-';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'เมื่อสักครู่';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`;
    return new Date(timestamp).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  }

  async function updateCoupleLocationUI() {
    const fresh = coupleLocations.fresh;
    const maiyuu = coupleLocations.maiyuu;

    // Fresh UI
    if (gpsPlaceFresh) gpsPlaceFresh.textContent = fresh ? (fresh.address || `พิกัด ${fresh.lat.toFixed(3)}, ${fresh.lng.toFixed(3)}`) : 'ยังไม่มีพิกัดล่าสุด';
    if (gpsTimeFresh) gpsTimeFresh.textContent = fresh ? `อัปเดต: ${formatRelativeTime(fresh.timestamp)}` : '-';

    // Maiyuu UI
    if (gpsPlaceMaiyuu) gpsPlaceMaiyuu.textContent = maiyuu ? (maiyuu.address || `พิกัด ${maiyuu.lat.toFixed(3)}, ${maiyuu.lng.toFixed(3)}`) : 'ยังไม่มีพิกัดล่าสุด';
    if (gpsTimeMaiyuu) gpsTimeMaiyuu.textContent = maiyuu ? `อัปเดต: ${formatRelativeTime(maiyuu.timestamp)}` : '-';

    // Distance Calculation
    if (fresh && maiyuu && typeof fresh.lat === 'number' && typeof maiyuu.lat === 'number') {
      const distKm = calculateHaversineDistance(fresh.lat, fresh.lng, maiyuu.lat, maiyuu.lng);
      if (gpsDistanceDisplay) {
        if (distKm < 0.08) {
          gpsDistanceDisplay.textContent = '0 เมตร (อยู่ด้วยกัน)';
          if (gpsDistanceStatus) gpsDistanceStatus.textContent = '🎉 ตอนนี้เราสองคนอยู่ด้วยกันแล้วนะ! 💕';
        } else if (distKm < 1) {
          const meters = Math.round(distKm * 1000);
          gpsDistanceDisplay.textContent = `${meters} เมตร`;
          if (gpsDistanceStatus) gpsDistanceStatus.textContent = 'ใกล้กันแค่นิดเดียว เดินไปหากันได้นะ 🥰';
        } else {
          gpsDistanceDisplay.textContent = `${distKm.toFixed(1)} กม.`;
          if (gpsDistanceStatus) gpsDistanceStatus.textContent = 'ส่งความรักข้ามระยะทางไปหาเธอนะ 💖';
        }
      }
    } else {
      if (gpsDistanceDisplay) gpsDistanceDisplay.textContent = 'รอซิงก์พิกัดทั้งคู่';
      if (gpsDistanceStatus) gpsDistanceStatus.textContent = 'กด "อัปเดตตำแหน่งของฉัน" เพื่อเริ่มแชร์ 📍';
    }

    // Update Leaflet Map Markers
    if (coupleMap && typeof L !== 'undefined') {
      const isTogether = fresh && maiyuu && typeof fresh.lat === 'number' && typeof maiyuu.lat === 'number' && calculateHaversineDistance(fresh.lat, fresh.lng, maiyuu.lat, maiyuu.lng) < 0.08;

      if (isTogether) {
        // --- TOGETHER MODE: SHOW SINGLE MERGED PAIR MARKER (NO OVERLAPPING!) ---
        if (markerFresh) { coupleMap.removeLayer(markerFresh); markerFresh = null; }
        if (markerMaiyuu) { coupleMap.removeLayer(markerMaiyuu); markerMaiyuu = null; }
        if (distanceLine) { coupleMap.removeLayer(distanceLine); distanceLine = null; }

        const togetherLatLng = [(fresh.lat + maiyuu.lat) / 2, (fresh.lng + maiyuu.lng) / 2];
        const togetherIcon = L.divIcon({
          className: 'together-avatar-container',
          html: `
            <div class="together-bubble-pair">
              <div class="map-avatar-bubble mini">👨</div>
              <div class="together-heart-badge">💖</div>
              <div class="map-avatar-bubble mini partner">👩</div>
            </div>
            <div class="map-avatar-tag together">Fresh & Maiyuu อยู่ด้วยกัน 💕</div>
          `,
          iconSize: [160, 65],
          iconAnchor: [80, 32]
        });

        if (!markerTogether) {
          markerTogether = L.marker(togetherLatLng, { icon: togetherIcon }).addTo(coupleMap);
        } else {
          markerTogether.setLatLng(togetherLatLng);
          markerTogether.setIcon(togetherIcon);
        }
        markerTogether.bindPopup(`<b>👩‍❤️‍👨 Fresh & Maiyuu</b><br>${fresh.address || maiyuu.address || ''}<br><small>🎉 ตอนนี้อยู่ด้วยกันแล้วนะคะ 💕</small>`);
      } else {
        // --- SEPARATE MODE: SHOW INDIVIDUAL FRESH & MAIYUU MARKERS ---
        if (markerTogether) {
          coupleMap.removeLayer(markerTogether);
          markerTogether = null;
        }

        // 1. Fresh Marker
        if (fresh && typeof fresh.lat === 'number') {
          const freshLatLng = [fresh.lat, fresh.lng];
          const freshIcon = L.divIcon({
            className: 'custom-map-avatar-marker',
            html: `
              <div class="map-avatar-bubble">
                <span class="map-pulse-halo"></span>
                👨
              </div>
              <div class="map-avatar-tag">Fresh (เค้า)</div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 30]
          });

          if (!markerFresh) {
            markerFresh = L.marker(freshLatLng, { icon: freshIcon }).addTo(coupleMap);
          } else {
            markerFresh.setLatLng(freshLatLng);
            markerFresh.setIcon(freshIcon);
          }
          markerFresh.bindPopup(`<b>👨 Fresh (เค้า)</b><br>${fresh.address || ''}<br><small>อัปเดต: ${formatRelativeTime(fresh.timestamp)}</small>`);
        }

        // 2. Maiyuu Marker
        if (maiyuu && typeof maiyuu.lat === 'number') {
          const maiyuuLatLng = [maiyuu.lat, maiyuu.lng];
          const maiyuuIcon = L.divIcon({
            className: 'custom-map-avatar-marker',
            html: `
              <div class="map-avatar-bubble partner">
                <span class="map-pulse-halo" style="background: rgba(233, 30, 99, 0.4);"></span>
                👩
              </div>
              <div class="map-avatar-tag" style="background: #e91e63;">Maiyuu (แฟน)</div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 30]
          });

          if (!markerMaiyuu) {
            markerMaiyuu = L.marker(maiyuuLatLng, { icon: maiyuuIcon }).addTo(coupleMap);
          } else {
            markerMaiyuu.setLatLng(maiyuuLatLng);
            markerMaiyuu.setIcon(maiyuuIcon);
          }
          markerMaiyuu.bindPopup(`<b>👩 Maiyuu (แฟน)</b><br>${maiyuu.address || ''}<br><small>อัปเดต: ${formatRelativeTime(maiyuu.timestamp)}</small>`);
        }

        // 3. Connect Line
        if (fresh && maiyuu && typeof fresh.lat === 'number' && typeof maiyuu.lat === 'number') {
          const latLngs = [[fresh.lat, fresh.lng], [maiyuu.lat, maiyuu.lng]];
          if (!distanceLine) {
            distanceLine = L.polyline(latLngs, {
              color: '#ff4b72',
              weight: 3.5,
              dashArray: '8, 8',
              opacity: 0.85
            }).addTo(coupleMap);
          } else {
            distanceLine.setLatLngs(latLngs);
          }
        } else if (distanceLine) {
          coupleMap.removeLayer(distanceLine);
          distanceLine = null;
        }
      }
    }
  }

  function fitCoupleMapBounds() {
    if (!coupleMap) return;
    const fresh = coupleLocations.fresh;
    const maiyuu = coupleLocations.maiyuu;

    if (fresh && maiyuu && typeof fresh.lat === 'number' && typeof maiyuu.lat === 'number') {
      const bounds = L.latLngBounds([[fresh.lat, fresh.lng], [maiyuu.lat, maiyuu.lng]]);
      coupleMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (fresh && typeof fresh.lat === 'number') {
      coupleMap.setView([fresh.lat, fresh.lng], 14);
    } else if (maiyuu && typeof maiyuu.lat === 'number') {
      coupleMap.setView([maiyuu.lat, maiyuu.lng], 14);
    }
  }

  function updateCurrentLocation(showToastMsg = true) {
    if (!navigator.geolocation) {
      showToast('เบราว์เซอร์นี้ไม่รองรับการใช้งาน GPS 🥺', 'error');
      return;
    }

    if (showToastMsg) {
      showToast('กำลังตรวจจับพิกัด GPS... 🛰️', 'info', 2500);
      if (gpsUpdateBtn) gpsUpdateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปเดต...';
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const address = await getThaiPlaceName(lat, lng);

        coupleLocations[activeGpsRole] = {
          lat: lat,
          lng: lng,
          accuracy: accuracy,
          address: address,
          timestamp: Date.now()
        };

        try {
          localStorage.setItem('love_locations', JSON.stringify(coupleLocations));
        } catch (e) { }

        updateCoupleLocationUI();
        fitCoupleMapBounds();
        spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 20);

        if (showToastMsg) {
          showToast(`อัปเดตตำแหน่งของ ${activeGpsRole === 'fresh' ? 'Fresh (เค้า)' : 'Maiyuu (แฟน)'} สำเร็จแล้ว 📍`, 'success');
        }

        if (gpsUpdateBtn) gpsUpdateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> อัปเดตตำแหน่งของฉัน';

        // Sync to Supabase Cloud
        await pushToCloud();
      },
      (err) => {
        console.warn('Geolocation error:', err);
        let msg = 'ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด Location บนมือถือ/เบราว์เซอร์นะคะ 🥺';
        if (err.code === 1) msg = 'กรุณากด "อนุญาต (Allow)" ให้เข้าถึงพิกัด GPS นะคะ 📍';
        showToast(msg, 'error', 4000);
        if (gpsUpdateBtn) gpsUpdateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> อัปเดตตำแหน่งของฉัน';
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  }

  function toggleLiveTracking() {
    if (isLiveTracking) {
      // Stop tracking
      if (watchPositionId !== null) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
      }
      isLiveTracking = false;
      if (gpsLiveText) gpsLiveText.textContent = 'ติดตามสด: ปิด';
      if (gpsLiveToggleBtn) gpsLiveToggleBtn.classList.remove('btn-primary');
      showToast('ปิดโหมดติดตามสดแล้ว 🛰️', 'info');
    } else {
      if (!navigator.geolocation) {
        showToast('เบราว์เซอร์ไม่รองรับ GPS', 'error');
        return;
      }

      isLiveTracking = true;
      if (gpsLiveText) gpsLiveText.textContent = 'ติดตามสด: เปิด 🟢';
      if (gpsLiveToggleBtn) gpsLiveToggleBtn.classList.add('btn-primary');
      showToast('เปิดโหมดติดตามสดแล้ว ระบบจะอัปเดตพิกัดอัตโนมัติ 💕', 'success');

      updateCurrentLocation(false);

      watchPositionId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const address = await getThaiPlaceName(lat, lng);

          coupleLocations[activeGpsRole] = {
            lat: lat,
            lng: lng,
            accuracy: accuracy,
            address: address,
            timestamp: Date.now()
          };

          try { localStorage.setItem('love_locations', JSON.stringify(coupleLocations)); } catch (e) { }

          updateCoupleLocationUI();
          await pushToCloud();
        },
        (err) => {
          console.warn('WatchPosition error:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 15000
        }
      );
    }
  }

  // RUN APP!
  initApp();
});
