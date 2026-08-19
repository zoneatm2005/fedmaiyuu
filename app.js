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
    renderTimeline();
    renderBucketList();

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

  function verifyPin() {
    if (VALID_PINS.includes(enteredPin)) {
      // SUCCESS: Unlock!
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
      // ERROR: Shake & Feedback
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
    renderTimeline();

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
    renderTimeline();

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

      // 1. Try Supabase JS Client (Separate Tables or Shared JSON)
      if (supabase) {
        try {
          // Check love_memories table
          const { data: memRows } = await supabase.from('love_memories').select('*');
          if (Array.isArray(memRows) && memRows.length > 0) {
            cloudPhotos = memRows.map(r => ({
              id: r.id,
              title: r.title,
              date: r.date,
              category: r.category,
              caption: r.caption,
              imageSrc: r.image_url || r.imageSrc
            }));
          }

          // Check love_bucket table
          const { data: bucketRows } = await supabase.from('love_bucket').select('*');
          if (Array.isArray(bucketRows) && bucketRows.length > 0) {
            cloudBucket = bucketRows.map(r => ({
              id: r.id,
              text: r.text,
              completed: !!r.completed
            }));
          }

          // Check unified love_data table
          if (!cloudPhotos || !cloudBucket) {
            const { data: rows } = await supabase.from('love_data').select('data').eq('id', 'shared_app_data');
            if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
              if (!cloudPhotos && Array.isArray(rows[0].data.photos)) cloudPhotos = rows[0].data.photos;
              if (!cloudBucket && Array.isArray(rows[0].data.bucketList)) cloudBucket = rows[0].data.bucketList;
            }
          }
        } catch (err) {
          console.warn('Supabase fetch error:', err);
        }
      }

      // 2. Try Supabase REST API Fallback
      if (!cloudPhotos || !cloudBucket) {
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
              if (!cloudPhotos && Array.isArray(rows[0].data.photos)) cloudPhotos = rows[0].data.photos;
              if (!cloudBucket && Array.isArray(rows[0].data.bucketList)) cloudBucket = rows[0].data.bucketList;
            }
          }
        } catch (err) { }
      }

      // 3. Fallback Online Store if Supabase is still connecting
      if (!cloudPhotos && !cloudBucket) {
        try {
          const res = await fetch(FALLBACK_SYNC_URL);
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
              if (Array.isArray(data.photos)) cloudPhotos = data.photos;
              if (Array.isArray(data.bucketList)) cloudBucket = data.bucketList;
            }
          }
        } catch (err) { }
      }

      // --- SMART MERGE: FILTER OUT DELETED ITEMS & PRESERVE UNPERSISTED ADDITIONS ---
      let updated = false;

      if (Array.isArray(cloudPhotos)) {
        const cleanCloudPhotos = cloudPhotos.filter(p =>
          p.id !== 'photo-1' && p.id !== 'photo-2' && p.id !== 'photo-3' &&
          !deletedPhotoIds.includes(p.id)
        );

        // Keep local active photos (ignoring deleted ones)
        const activeLocalPhotos = photos.filter(p => !deletedPhotoIds.includes(p.id));

        const mergedPhotosMap = new Map();
        cleanCloudPhotos.forEach(p => mergedPhotosMap.set(p.id, p));
        activeLocalPhotos.forEach(p => {
          if (!mergedPhotosMap.has(p.id)) {
            mergedPhotosMap.set(p.id, p);
          }
        });

        const mergedPhotos = Array.from(mergedPhotosMap.values());
        if (JSON.stringify(mergedPhotos) !== JSON.stringify(photos)) {
          photos = mergedPhotos;
          try { localStorage.setItem('love_photos', JSON.stringify(photos)); } catch (e) { }
          renderGallery();
          renderTimeline();
          updated = true;
        }
      }

      if (Array.isArray(cloudBucket)) {
        const cleanCloudBucket = cloudBucket.filter(b =>
          b.id !== 'b1' && b.id !== 'b2' && b.id !== 'b3' && b.id !== 'b4' &&
          !deletedBucketIds.includes(b.id)
        );

        const activeLocalBucket = bucketList.filter(b => !deletedBucketIds.includes(b.id));

        const mergedBucketMap = new Map();
        cleanCloudBucket.forEach(b => mergedBucketMap.set(b.id, b));
        activeLocalBucket.forEach(b => {
          if (!mergedBucketMap.has(b.id)) {
            mergedBucketMap.set(b.id, b);
          }
        });

        const mergedBucket = Array.from(mergedBucketMap.values());
        if (JSON.stringify(mergedBucket) !== JSON.stringify(bucketList)) {
          bucketList = mergedBucket;
          try { localStorage.setItem('love_bucket', JSON.stringify(bucketList)); } catch (e) { }
          renderBucketList();
          updated = true;
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
  // 4. TIMELINE & BUCKET LIST
  // ==========================================================================

  function renderTimeline() {
    const timelineList = document.getElementById('timeline-list');
    timelineList.innerHTML = '';

    const sorted = [...photos].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length === 0) {
      timelineList.innerHTML = `<p style="text-align: center; color: var(--text-muted);">ยังไม่มีข้อมูลไทม์ไลน์ ให้เพิ่มรูปภาพก่อนครับ 💕</p>`;
      return;
    }

    sorted.forEach((photo) => {
      const parts = photo.date.split('-');
      const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-date">${formattedDate}</div>
          <h3 style="font-size: 1.15rem; color: var(--text-dark);">${escapeHtml(photo.title)}</h3>
          <p style="font-size: 0.92rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(photo.caption)}</p>
        </div>
      `;
      timelineList.appendChild(item);
    });
  }

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

  // ==========================================================================
  // 5. NAVIGATION & SETTINGS
  // ==========================================================================

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Close modals when clicking overlay
  [uploadModal, lightboxModal, bucketModal].forEach(modal => {
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

  // RUN APP!
  initApp();
});
