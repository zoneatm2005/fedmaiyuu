/* ==========================================================================
   LOVE MEMORY - ANNIVERSARY & GALLERY APPLICATION LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- DEFAULT STATE & STORAGE CONFIG ---
  const DEFAULT_ANNIVERSARY_DATE = '2026-08-02'; // รหัสผ่านวันครบรอบตั้งต้น: 02/08/2026
  const DEFAULT_COUPLE_NAMES = 'You & Me 💕';

  let config = {
    anniversaryDate: localStorage.getItem('love_anniversary_date') || DEFAULT_ANNIVERSARY_DATE,
    coupleNames: localStorage.getItem('love_couple_names') || DEFAULT_COUPLE_NAMES,
    theme: localStorage.getItem('love_theme') || 'default',
    unlocked: sessionStorage.getItem('love_unlocked') === 'true'
  };

  // --- INITIAL SAMPLE PHOTOS (High Quality Romantic Visuals) ---
  const DEFAULT_PHOTOS = [
    {
      id: 'photo-1',
      title: 'เดตแรกที่คาเฟ่ ☕',
      date: '2026-08-02',
      category: 'First Date',
      caption: 'วันแรกที่เราตกลงคบกัน บรรยากาศอบอุ่น รอยยิ้มของเธอน่ารักที่สุดเลย ❤️',
      imageSrc: createCuteSvgDataUrl('☕', 'First Date Cafe', '#ffb3c6', '#ff85a1')
    },
    {
      id: 'photo-2',
      title: 'ทริปเที่ยวทะเลด้วยกัน 🌊',
      date: '2026-08-10',
      category: 'Trips',
      caption: 'ลมทะเลเย็นๆ กับมือที่จับกันไว้ ไม่เคยรู้สึกมีความสุขขนาดนี้มาก่อน',
      imageSrc: createCuteSvgDataUrl('🌊', 'Sunset Beach Trip', '#a2d2ff', '#bde0fe')
    },
    {
      id: 'photo-3',
      title: 'รูปคู่ฮาๆ ช่วงเวลาน่ารัก 🐱',
      date: '2026-08-15',
      category: 'Cute',
      caption: 'แอบถ่ายรูปเธอตอนกินขนม น่ารักจนต้องบันทึกไว้ในความทรงจำ 🍓',
      imageSrc: createCuteSvgDataUrl('🐱', 'Sweet Cute Moments', '#ffc8dd', '#ffafcc')
    }
  ];

  let savedPhotos = null;
  try {
    const raw = localStorage.getItem('love_photos');
    if (raw) savedPhotos = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  let photos = (Array.isArray(savedPhotos) && savedPhotos.length > 0) ? savedPhotos : DEFAULT_PHOTOS;
  if (!savedPhotos || savedPhotos.length === 0) {
    try { localStorage.setItem('love_photos', JSON.stringify(DEFAULT_PHOTOS)); } catch(e) {}
  }

  let bucketList = JSON.parse(localStorage.getItem('love_bucket')) || [
    { id: 'b1', text: 'ไปดูพระอาทิตย์ตกที่ทะเลด้วยกัน 🌅', completed: true },
    { id: 'b2', text: 'ใส่เสื้อคู่ไปเที่ยวงานเทศกาล 🎡', completed: false },
    { id: 'b3', text: 'ทำอาหารด้วยกันมื้อเย็น 🍝', completed: false },
    { id: 'b4', text: 'ฉลองวันครบรอบทุกปีตลอดไป 🎂', completed: false }
  ];

  // --- DOM ELEMENTS ---
  const lockScreen = document.getElementById('lock-screen');
  const lockForm = document.getElementById('lock-form');
  const passInput = document.getElementById('anniversary-pass-input');
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
  let counterInterval = null;

  // ==========================================================================
  // 1. INITIALIZATION & PASSCODE UNLOCK LOGIC
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
      passInput.value = config.anniversaryDate;
    }

    // Render Components
    renderGallery();
    renderTimeline();
    renderBucketList();

    // Init Floating Canvas Hearts Animation
    initHeartsCanvas();
  }

  // Check Passcode Login
  lockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredDate = passInput.value;

    if (enteredDate === config.anniversaryDate) {
      // SUCCESS: Unlock!
      config.unlocked = true;
      sessionStorage.setItem('love_unlocked', 'true');

      // Heart burst effect
      spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 30);
      
      lockScreen.classList.add('unlocked');
      startLoveCounter();
    } else {
      // ERROR: Shake Card
      const lockCard = document.querySelector('.lock-card');
      lockCard.classList.add('error-shake');
      setTimeout(() => lockCard.classList.remove('error-shake'), 600);
      
      alert('💔 รหัสผ่านวันครบรอบไม่ถูกต้อง ลองใส่วันที่ 02/08/2026 ดูนะจ๊ะ');
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

  function renderGallery() {
    galleryGrid.innerHTML = '';

    const filtered = currentFilter === 'all'
      ? photos
      : photos.filter(p => p.category === currentFilter);

    if (filtered.length === 0) {
      galleryGrid.innerHTML = `
        <div class="empty-gallery">
          <div class="empty-icon">📷</div>
          <h3 style="font-family: var(--font-heading); color: var(--text-dark);">ยังไม่มีรูปภาพในหมวดหมู่นี้</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">กดปุ่ม "เพิ่มรูปภาพความทรงจำ" เพื่อเพิ่มรูปรูปแรกสิคะ 💕</p>
        </div>
      `;
      return;
    }

    filtered.forEach(photo => {
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
  }

  // Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderGallery();
    });
  });

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

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ');
      return;
    }

    // Compress & Resize slightly if large to ensure fast sync & local storage fit
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200; // max 1200px width/height

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

        activePhotoDataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% JPEG quality
        previewImg.src = activePhotoDataUrl;
        previewContainer.style.display = 'block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('photo-title-input').value.trim();
    const date = document.getElementById('photo-date-input').value;
    const category = document.getElementById('photo-cat-select').value;
    const caption = document.getElementById('photo-caption-input').value.trim();

    if (!activePhotoDataUrl) {
      alert('กรุณาเลือกรูปภาพความทรงจำก่อนครับ');
      return;
    }

    const newPhoto = {
      id: 'photo-' + Date.now(),
      title: title || 'ความทรงจำของเรา',
      date: date || new Date().toISOString().split('T')[0],
      category: category,
      caption: caption || 'บันทึกความรู้สึกหวานๆ 💕',
      imageSrc: activePhotoDataUrl
    };

    photos.unshift(newPhoto); // Add to top
    savePhotos();
    renderGallery();
    renderTimeline();

    uploadModal.classList.remove('active');
    resetUploadForm();

    // Burst hearts celebration
    spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 25);
  });

  function resetUploadForm() {
    uploadForm.reset();
    activePhotoDataUrl = null;
    previewContainer.style.display = 'none';
    previewImg.src = '';
  }

  function deletePhoto(id) {
    photos = photos.filter(p => p.id !== id);
    savePhotos();
    renderGallery();
    renderTimeline();
  }

  function savePhotos() {
    try {
      localStorage.setItem('love_photos', JSON.stringify(photos));
    } catch (err) {
      console.warn('LocalStorage limit:', err);
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

    bucketList.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = `bucket-item ${item.completed ? 'completed' : ''}`;
      el.innerHTML = `
        <input type="checkbox" class="bucket-checkbox" ${item.completed ? 'checked' : ''}>
        <span class="bucket-text">${escapeHtml(item.text)}</span>
        <button class="action-btn delete-bucket" style="width: 26px; height: 26px; font-size: 0.75rem;">&times;</button>
      `;

      const chk = el.querySelector('.bucket-checkbox');
      chk.addEventListener('change', () => {
        bucketList[index].completed = chk.checked;
        saveBucketList();
        renderBucketList();
      });

      const delBtn = el.querySelector('.delete-bucket');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bucketList.splice(index, 1);
        saveBucketList();
        renderBucketList();
      });

      bucketListContainer.appendChild(el);
    });
  }

  addBucketBtn.addEventListener('click', () => {
    const text = prompt('ใส่กิจกรรมน่ารักๆ ที่อยากทำด้วยกัน 💖:');
    if (text && text.trim()) {
      bucketList.push({ id: 'b-' + Date.now(), text: text.trim(), completed: false });
      saveBucketList();
      renderBucketList();
    }
  });

  function saveBucketList() {
    localStorage.setItem('love_bucket', JSON.stringify(bucketList));
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
  [uploadModal, lightboxModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
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

  function createCuteSvgDataUrl(emoji, label, color1, color2) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
      <defs>
        <linearGradient id="g_${Math.random().toString(36).substring(2)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${color2}" stop-opacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="600" height="450" fill="${color1}" />
      <circle cx="300" cy="200" r="95" fill="white" opacity="0.35" />
      <text x="300" y="225" font-size="90" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      <text x="300" y="340" font-family="sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
    </svg>`;
    try {
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch(e) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  }

  // RUN APP!
  initApp();
});
