/* ==========================================================================
   ADMIN STUDIO CONTROLLER (/quan-ly/)
   - Personalized Guest Link Generator (Nhà Trai / Nhà Gái / Bản Chung) + Copy
   - 2-Tab Configuration (Nhà Trai / Nhà Gái): 2-Level Vietnam Address,
     Date & Time + Live Lunar Calendar, Mother's Name, Bank & QR Upload
   - Visual Featured & 7-Slot "Our Album" Photo Uploader
   - Instant Local Save (IndexedDB) + Optional 1-Click GitHub Pages Live Publish
   ========================================================================== */

(() => {
  'use strict';

  const WS = window.WeddingStore;
  const BASE = '..';
  const HISTORY_KEY = 'thiep_cuoi_guest_link_history_v1';
  const GH_TOKEN_KEY = 'thiep_cuoi_gh_token_v1';

  const $ = (id) => document.getElementById(id);

  const FEATURED_SLOTS = [
    { key: 'hero', label: 'Ảnh bìa đầu trang (Hero)', sub: 'Khung mở đầu toàn màn hình' },
    { key: 'interlude', label: 'Ảnh “Forever & Always”', sub: 'Ảnh ngang dưới phong bì' },
    { key: 'polaroidGroom', label: 'Ảnh Polaroid Chú Rể', sub: 'Khung “The Groom”' },
    { key: 'polaroidBride', label: 'Ảnh Polaroid Cô Dâu', sub: 'Khung “The Bride”' },
    { key: 'vinylLabel', label: 'Ảnh tâm đĩa nhạc Vinyl', sub: 'Ảnh tròn giữa đĩa nhạc' },
    { key: 'footerBg', label: 'Ảnh nền lời cảm ơn', sub: 'Ảnh nền mục “Thank you!”' }
  ];

  const ALBUM_LABELS = [
    'Vị trí 1 · Ngang lớn trên',
    'Vị trí 2 · Vuông trái trên',
    'Vị trí 3 · Dọc lớn bên phải',
    'Vị trí 4 · Vuông trái dưới',
    'Vị trí 5 · Ngang lớn giữa',
    'Vị trí 6 · Dọc dưới trái',
    'Vị trí 7 · Dọc dưới phải'
  ];

  let vnUnits = []; // [ [provinceName, [wardName, ...]], ... ]
  let draft = WS.clone(WS.DEFAULT_CONFIG);
  let activeSide = 'groom';
  let pendingPhotoSlot = null;
  let lastSideCreated = 'nha-trai';
  let dirty = {
    groom: false,
    bride: false,
    sheet: false,
    photoKeys: new Set(),
    albumIndices: new Set(),
    forceFullReplace: false
  };

  const DB_PAGE_SIZE = 10;
  let dbState = {
    side: 'all',
    type: 'all',
    viewed: 'all',
    rsvp: 'all',
    q: '',
    page: 1,
    lastResult: null
  };
  let dbSearchTimer = null;

  function resetDirty() {
    dirty = { groom: false, bride: false, sheet: false, photoKeys: new Set(), albumIndices: new Set(), forceFullReplace: false };
  }

  function encodeTokenHash(tok) {
    return btoa(tok).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeTokenHash(encoded) {
    try {
      const norm = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const pad = norm.length % 4 ? '='.repeat(4 - (norm.length % 4)) : '';
      return atob(norm + pad);
    } catch (_) {
      return '';
    }
  }

  const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const EXT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(window._adminToastTimer);
    window._adminToastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function normVi(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise((resolve) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
      resolve();
    });
  }

  /* =========================================================================
     1. PERSONALIZED GUEST LINK GENERATOR
     ========================================================================= */
  function getSiteRootUrl() {
    try {
      const u = new URL('../', window.location.href);
      return u.href.replace(/index\.html$/i, '');
    } catch (_) {
      return 'https://thiepcuoi-vannam-kimtien.com/';
    }
  }

  function genGuestId() {
    return `K-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }

  function buildGuestUrl(sidePath, guestName, gid) {
    const root = getSiteRootUrl();
    const path = sidePath === 'both' ? '' : `${sidePath}/`;
    const qs = new URLSearchParams();
    if (guestName) qs.set('khach', guestName);
    if (gid) qs.set('gid', gid);
    const q = qs.toString();
    return `${root}${path}${q ? `?${q}` : ''}`;
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(arr) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 15)));
    } catch (_) {}
  }

  function renderHistory() {
    const list = loadHistory();
    const wrap = $('linkHistoryWrap');
    const container = $('linkHistoryList');
    if (!list.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    container.innerHTML = list.map((item, idx) => {
      const sideLabel = item.side === 'nha-trai' ? 'Nhà Trai' : (item.side === 'nha-gai' ? 'Nhà Gái' : 'Bản 2 họ');
      return `
        <div class="history-item">
          <div class="history-meta">
            <div class="history-name">${escHtml(item.guest)} <span style="color:var(--gold); font-weight:600; font-size:11.5px;">· ${sideLabel}</span></div>
            <div class="history-sub">${escHtml(item.url)}</div>
          </div>
          <div class="history-actions">
            <button type="button" class="mini-icon-btn" data-hist-copy="${idx}" title="Copy link" aria-label="Copy link">${COPY_SVG}</button>
            <a href="${escHtml(item.url)}" target="_blank" rel="noopener" class="mini-icon-btn" title="Mở thiệp" aria-label="Mở thiệp">${EXT_SVG}</a>
          </div>
        </div>
      `;
    }).join('');
  }

  function generateGuestLink(side) {
    const name = $('guestNameInput').value.trim();
    if (!name) {
      showToast('Vui lòng nhập tên khách mời trước khi tạo link!');
      $('guestNameInput').focus();
      return;
    }
    lastSideCreated = side;

    const existingHist = loadHistory();
    const matched = existingHist.find((x) => normVi(x.guest) === normVi(name) && x.side === side && x.gid);
    const gid = matched ? matched.gid : genGuestId();
    const url = buildGuestUrl(side, name, gid);
    const sideLabel = side === 'nha-trai' ? 'Nhà Trai' : (side === 'nha-gai' ? 'Nhà Gái' : 'Bản chung');

    const tagEl = $('linkSideTag');
    tagEl.className = 'link-side-tag' + (side === 'nha-gai' ? ' bride' : (side === 'both' ? ' both' : ''));
    tagEl.textContent = side === 'nha-trai' ? 'Thiệp Nhà Trai' : (side === 'nha-gai' ? 'Thiệp Nhà Gái' : 'Bản Đầy Đủ (2 Họ)');

    $('linkGuestPreview').textContent = `Kính mời: ${name}`;
    $('generatedUrlInput').value = url;
    $('btnOpenGeneratedLink').href = url;
    $('linkResultBox').classList.remove('hidden');

    // Reset copy button icon
    const copyBtn = $('btnCopyGeneratedLink');
    copyBtn.classList.remove('copied');
    $('copyIconSvg').outerHTML = COPY_SVG.replace('<svg ', '<svg id="copyIconSvg" ');
    $('copyBtnLabel').textContent = 'Copy';

    // Save to history (dedupe exact URL or same guest+side)
    const hist = existingHist.filter((x) => x.url !== url && !(normVi(x.guest) === normVi(name) && x.side === side));
    hist.unshift({ guest: name, side, gid, url, ts: Date.now() });
    saveHistory(hist);
    renderHistory();

    // Register named guest in Google Sheet DB (and local mirror immediately)
    WS.sheetPost(draft.sheetApiUrl, {
      action: 'register_guest',
      id: gid,
      name,
      side: sideLabel,
      isNamed: true,
      link: url,
      sourceMode: side
    }).finally(() => {
      loadGuestDb(1);
    });

    showToast(`Đã tạo link & ghi nhận khách mời: ${name}!`);
  }

  function initLinkGenerator() {
    $('btnCreateGroomLink').addEventListener('click', () => generateGuestLink('nha-trai'));
    $('btnCreateBrideLink').addEventListener('click', () => generateGuestLink('nha-gai'));
    $('btnCreateBothLink').addEventListener('click', () => generateGuestLink('both'));

    $('guestNameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        generateGuestLink(lastSideCreated);
      }
    });

    $('btnCopyGeneratedLink').addEventListener('click', () => {
      const url = $('generatedUrlInput').value;
      if (!url) return;
      copyText(url).then(() => {
        const btn = $('btnCopyGeneratedLink');
        btn.classList.add('copied');
        const svg = $('copyIconSvg');
        if (svg) svg.outerHTML = CHECK_SVG.replace('<svg ', '<svg id="copyIconSvg" ');
        $('copyBtnLabel').textContent = 'Đã copy';
        showToast('Đã sao chép đường link thiệp cưới!');
        setTimeout(() => {
          btn.classList.remove('copied');
          const curSvg = $('copyIconSvg');
          if (curSvg) curSvg.outerHTML = COPY_SVG.replace('<svg ', '<svg id="copyIconSvg" ');
          $('copyBtnLabel').textContent = 'Copy';
        }, 1800);
      });
    });

    $('linkHistoryList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-hist-copy]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.histCopy, 10);
      const item = loadHistory()[idx];
      if (!item) return;
      copyText(item.url).then(() => {
        btn.innerHTML = CHECK_SVG;
        showToast(`Đã copy link của ${item.guest}!`);
        setTimeout(() => { btn.innerHTML = COPY_SVG; }, 1400);
      });
    });

    $('btnClearHistory').addEventListener('click', () => {
      saveHistory([]);
      renderHistory();
      showToast('Đã xóa lịch sử link gần đây');
    });

    renderHistory();
  }

  /* =========================================================================
     2. TWO-LEVEL VIETNAM ADDRESS PICKER & TIME SELECTORS
     ========================================================================= */
  function populateTimeSelects() {
    const hoursHtml = Array.from({ length: 24 }, (_, h) => {
      const v = String(h).padStart(2, '0');
      return `<option value="${v}">${v} giờ</option>`;
    }).join('');
    const minsHtml = Array.from({ length: 60 }, (_, m) => {
      const v = String(m).padStart(2, '0');
      return `<option value="${v}">${v} phút</option>`;
    }).join('');

    ['cfgPartyHour', 'cfgCeremonyHour'].forEach((id) => { $(id).innerHTML = hoursHtml; });
    ['cfgPartyMin', 'cfgCeremonyMin'].forEach((id) => { $(id).innerHTML = minsHtml; });
  }

  function populateProvinces(selectedProvince) {
    const sel = $('cfgProvince');
    if (!vnUnits.length) {
      sel.innerHTML = `<option value="${escHtml(selectedProvince || 'Thành phố Hà Nội')}">${escHtml(selectedProvince || 'Thành phố Hà Nội')}</option>`;
      return;
    }
    sel.innerHTML = vnUnits.map(([pName]) => `<option value="${escHtml(pName)}">${escHtml(pName)}</option>`).join('');
    if (selectedProvince && vnUnits.some(([p]) => p === selectedProvince)) {
      sel.value = selectedProvince;
    } else {
      sel.selectedIndex = 0;
    }
  }

  function populateWards(provinceName, selectedWard, filterText = '') {
    const sel = $('cfgWard');
    const found = vnUnits.find(([p]) => p === provinceName);
    const allWards = found ? found[1] : [];
    const q = normVi(filterText);
    const filtered = q ? allWards.filter((w) => normVi(w).includes(q)) : allWards;

    const listToShow = filtered.length ? filtered : allWards;
    if (!listToShow.length) {
      sel.innerHTML = `<option value="${escHtml(selectedWard || '')}">${escHtml(selectedWard || '— Chọn Xã / Phường —')}</option>`;
      return;
    }

    sel.innerHTML = listToShow.map((w) => `<option value="${escHtml(w)}">${escHtml(w)}</option>`).join('');
    if (selectedWard && listToShow.includes(selectedWard)) {
      sel.value = selectedWard;
    } else if (selectedWard && !q) {
      const opt = document.createElement('option');
      opt.value = selectedWard;
      opt.textContent = selectedWard;
      sel.prepend(opt);
      sel.value = selectedWard;
    } else {
      sel.selectedIndex = 0;
    }
  }

  function updateAddressPreview() {
    const sideCfg = draft[activeSide];
    const full = WS.formatFullAddress(sideCfg);
    $('addrPreviewPill').innerHTML = `<strong>Địa chỉ hiển thị trên thiệp &amp; Bản đồ:</strong> ${escHtml(full || '(Chưa nhập địa chỉ)')}`;
  }

  function updateLunarPreviews() {
    const sideCfg = draft[activeSide];
    const renderLine = (dateStr, timeStr) => {
      const p = WS.parseDateParts(dateStr);
      const l = WS.solarToLunar(dateStr);
      return `${p.weekdayVi}, ${p.dd}/${p.mm}/${p.year} lúc ${timeStr} · Âm lịch: ${l.text}`;
    };
    $('partyLunarPreview').textContent = renderLine(sideCfg.partyDate, sideCfg.partyTime);
    $('ceremonyLunarPreview').textContent = renderLine(sideCfg.ceremonyDate, sideCfg.ceremonyTime);
  }

  function renderQrPreview() {
    const qrSrc = draft[activeSide].qrImage;
    const img = $('qrPreviewImg');
    const ph = $('qrPlaceholderTxt');
    const rmBtn = $('btnRemoveQr');

    if (qrSrc) {
      img.src = WS.resolveAsset(qrSrc, BASE);
      img.classList.remove('hidden');
      ph.classList.add('hidden');
      rmBtn.classList.remove('hidden');
    } else {
      img.src = '';
      img.classList.add('hidden');
      ph.classList.remove('hidden');
      rmBtn.classList.add('hidden');
    }
  }

  function loadSideToForm(side) {
    activeSide = side;
    const isGroom = side === 'groom';
    const sideCfg = draft[side];

    $('tabBtnGroom').classList.toggle('active', isGroom);
    $('tabBtnGroom').setAttribute('aria-selected', isGroom ? 'true' : 'false');
    $('tabBtnBride').classList.toggle('active', !isGroom);
    $('tabBtnBride').setAttribute('aria-selected', !isGroom ? 'true' : 'false');

    $('secFamilyHeading').querySelector('span').textContent = isGroom ? 'Thông tin gia đình Nhà Trai' : 'Thông tin gia đình Nhà Gái';
    $('lblPartyTime').textContent = isGroom ? 'Tiệc Cưới Nhà Trai' : 'Tiệc Cưới Nhà Gái';
    $('lblCeremonyTime').textContent = isGroom ? 'Lễ Thành Hôn (Nhà Trai)' : 'Lễ Vu Quy (Nhà Gái)';
    $('secBankHeading').querySelector('span').textContent = isGroom ? 'Thông tin mừng cưới Nhà Trai' : 'Thông tin mừng cưới Nhà Gái';

    $('cfgParentName').value = sideCfg.parent || '';
    $('cfgWardSearch').value = '';
    populateProvinces(sideCfg.province);
    populateWards(sideCfg.province, sideCfg.ward);
    $('cfgDetailAddress').value = sideCfg.detailAddress || '';
    $('cfgVenueNote').value = sideCfg.venueNote || '';

    $('cfgPartyDate').value = sideCfg.partyDate || '2027-01-02';
    const [pH = '16', pM = '30'] = String(sideCfg.partyTime || '16:30').split(':');
    $('cfgPartyHour').value = pH.padStart(2, '0');
    $('cfgPartyMin').value = pM.padStart(2, '0');

    $('cfgCeremonyDate').value = sideCfg.ceremonyDate || '2027-01-03';
    const [cH = '08', cM = '00'] = String(sideCfg.ceremonyTime || '08:00').split(':');
    $('cfgCeremonyHour').value = cH.padStart(2, '0');
    $('cfgCeremonyMin').value = cM.padStart(2, '0');

    $('cfgBankName').value = sideCfg.bankName || '';
    $('cfgBankAcc').value = sideCfg.bankAcc || '';
    $('cfgBankOwner').value = sideCfg.bankOwner || '';

    updateAddressPreview();
    updateLunarPreviews();
    renderQrPreview();
  }

  function bindConfigFormEvents() {
    $('tabBtnGroom').addEventListener('click', () => loadSideToForm('groom'));
    $('tabBtnBride').addEventListener('click', () => loadSideToForm('bride'));

    $('cfgParentName').addEventListener('input', (e) => {
      draft[activeSide].parent = e.target.value;
      dirty[activeSide] = true;
    });

    $('cfgProvince').addEventListener('change', (e) => {
      draft[activeSide].province = e.target.value;
      $('cfgWardSearch').value = '';
      populateWards(e.target.value, '');
      draft[activeSide].ward = $('cfgWard').value;
      dirty[activeSide] = true;
      updateAddressPreview();
    });

    $('cfgWardSearch').addEventListener('input', (e) => {
      populateWards($('cfgProvince').value, draft[activeSide].ward, e.target.value);
      if ($('cfgWard').value) {
        draft[activeSide].ward = $('cfgWard').value;
        dirty[activeSide] = true;
        updateAddressPreview();
      }
    });

    $('cfgWard').addEventListener('change', (e) => {
      draft[activeSide].ward = e.target.value;
      dirty[activeSide] = true;
      updateAddressPreview();
    });

    $('cfgDetailAddress').addEventListener('input', (e) => {
      draft[activeSide].detailAddress = e.target.value;
      dirty[activeSide] = true;
      updateAddressPreview();
    });

    $('cfgVenueNote').addEventListener('input', (e) => {
      draft[activeSide].venueNote = e.target.value;
      dirty[activeSide] = true;
    });

    const syncPartyTime = () => {
      draft[activeSide].partyDate = $('cfgPartyDate').value || '2027-01-02';
      draft[activeSide].partyTime = `${$('cfgPartyHour').value}:${$('cfgPartyMin').value}`;
      dirty[activeSide] = true;
      updateLunarPreviews();
    };
    $('cfgPartyDate').addEventListener('change', syncPartyTime);
    $('cfgPartyHour').addEventListener('change', syncPartyTime);
    $('cfgPartyMin').addEventListener('change', syncPartyTime);

    const syncCeremonyTime = () => {
      draft[activeSide].ceremonyDate = $('cfgCeremonyDate').value || '2027-01-03';
      draft[activeSide].ceremonyTime = `${$('cfgCeremonyHour').value}:${$('cfgCeremonyMin').value}`;
      dirty[activeSide] = true;
      updateLunarPreviews();
    };
    $('cfgCeremonyDate').addEventListener('change', syncCeremonyTime);
    $('cfgCeremonyHour').addEventListener('change', syncCeremonyTime);
    $('cfgCeremonyMin').addEventListener('change', syncCeremonyTime);

    $('cfgBankName').addEventListener('input', (e) => { draft[activeSide].bankName = e.target.value; dirty[activeSide] = true; });
    $('cfgBankAcc').addEventListener('input', (e) => { draft[activeSide].bankAcc = e.target.value; dirty[activeSide] = true; });
    $('cfgBankOwner').addEventListener('input', (e) => { draft[activeSide].bankOwner = e.target.value; dirty[activeSide] = true; });

    // QR File upload
    $('cfgQrFileInput').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        showToast('Đang tối ưu ảnh mã QR...');
        const dataUrl = await WS.compressImageFile(file, { maxEdge: 640, quality: 0.92 });
        draft[activeSide].qrImage = dataUrl;
        dirty[activeSide] = true;
        renderQrPreview();
        showToast('Đã tải ảnh QR thành công — hãy bấm Lưu cấu hình!');
      } catch (err) {
        showToast(err.message || 'Không thể đọc ảnh QR');
      }
    });

    $('btnRemoveQr').addEventListener('click', () => {
      draft[activeSide].qrImage = '';
      dirty[activeSide] = true;
      renderQrPreview();
      showToast('Đã xóa ảnh QR (chuyển về mẫu mặc định)');
    });
  }

  /* =========================================================================
     3. FEATURED PHOTOS & 7-SLOT "OUR ALBUM" VISUAL UPLOADER
     ========================================================================= */
  function getSlotSrc(slotSpec) {
    if (slotSpec.startsWith('album:')) {
      const idx = parseInt(slotSpec.split(':')[1], 10);
      return draft.photos.album[idx];
    }
    return draft.photos[slotSpec];
  }

  function getDefaultSlotSrc(slotSpec) {
    if (slotSpec.startsWith('album:')) {
      const idx = parseInt(slotSpec.split(':')[1], 10);
      return WS.DEFAULT_CONFIG.photos.album[idx];
    }
    return WS.DEFAULT_CONFIG.photos[slotSpec];
  }

  function setSlotSrc(slotSpec, value) {
    if (slotSpec.startsWith('album:')) {
      const idx = parseInt(slotSpec.split(':')[1], 10);
      draft.photos.album[idx] = value;
      dirty.albumIndices.add(idx);
      if (idx === 3) {
        draft.photos.storyBg = value;
        dirty.photoKeys.add('storyBg');
      }
    } else {
      draft.photos[slotSpec] = value;
      dirty.photoKeys.add(slotSpec);
      if (slotSpec === 'polaroidBride') {
        draft.photos.rsvpThanks = value;
        dirty.photoKeys.add('rsvpThanks');
      }
    }
  }

  function renderSlotInner(el, slotSpec, label, subLabel) {
    const cur = getSlotSrc(slotSpec);
    const def = getDefaultSlotSrc(slotSpec);
    const isCustom = cur !== def;
    const resolved = WS.resolveAsset(cur, BASE);

    el.innerHTML = `
      <img src="${escHtml(resolved)}" alt="${escHtml(label)}" loading="lazy" />
      <div class="photo-slot-overlay">
        <span class="photo-slot-pos">${escHtml(label)}</span>
        <span class="photo-slot-cta">${escHtml(subLabel || 'Chạm để đổi ảnh')}</span>
      </div>
      ${isCustom ? `<button type="button" class="photo-reset-btn" data-reset-slot="${escHtml(slotSpec)}" title="Về ảnh mặc định" aria-label="Khôi phục ảnh mặc định">↺</button>` : ''}
    `;
  }

  function renderAllPhotoSlots() {
    const featGrid = $('featuredPhotosGrid');
    featGrid.innerHTML = FEATURED_SLOTS.map((s) => `<div class="photo-slot" data-photo-slot="${s.key}"></div>`).join('');
    FEATURED_SLOTS.forEach((s) => {
      const el = featGrid.querySelector(`[data-photo-slot="${s.key}"]`);
      if (el) renderSlotInner(el, s.key, s.label, s.sub);
    });

    document.querySelectorAll('.album-editor-stage [data-photo-slot]').forEach((el) => {
      const spec = el.dataset.photoSlot;
      const idx = parseInt(spec.split(':')[1], 10);
      renderSlotInner(el, spec, ALBUM_LABELS[idx] || `Ảnh ${idx + 1}`, 'Chạm để thay ảnh');
    });
  }

  function initPhotoUploader() {
    const fileInput = $('sharedPhotoInput');

    document.addEventListener('click', (e) => {
      const resetBtn = e.target.closest('[data-reset-slot]');
      if (resetBtn) {
        e.stopPropagation();
        const spec = resetBtn.dataset.resetSlot;
        setSlotSrc(spec, getDefaultSlotSrc(spec));
        renderAllPhotoSlots();
        showToast('Đã khôi phục ảnh mặc định cho vị trí này');
        return;
      }

      const slotEl = e.target.closest('[data-photo-slot]');
      if (slotEl) {
        pendingPhotoSlot = slotEl.dataset.photoSlot;
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file || !pendingPhotoSlot) return;
      const targetSlot = pendingPhotoSlot;
      try {
        showToast('Đang nén & tối ưu ảnh...');
        const dataUrl = await WS.compressImageFile(file, { maxEdge: 1200, quality: 0.84 });
        setSlotSrc(targetSlot, dataUrl);
        renderAllPhotoSlots();
        showToast('Đã cập nhật ảnh mới — hãy bấm Lưu cấu hình!');
      } catch (err) {
        showToast(err.message || 'Không thể tải ảnh này');
      }
    });
  }

  /* =========================================================================
     4. GITHUB TOKEN SYNC, BRIDE MAGIC SETUP LINK & SAVE / RESET CONTROLS
     ========================================================================= */
  function getSavedToken() {
    try { return (localStorage.getItem(GH_TOKEN_KEY) || '').trim(); } catch (_) { return ''; }
  }

  function updateSyncBadge() {
    const hasToken = Boolean(getSavedToken());
    const badge = $('syncStatusBadge');
    badge.textContent = hasToken ? 'Đã kết nối GitHub' : 'Lưu trên máy này';
    badge.classList.toggle('connected', hasToken);
    $('btnClearToken').classList.toggle('hidden', !hasToken);
    $('shareBrideSetupBox').classList.toggle('hidden', !hasToken);
    $('btnSaveLabel').textContent = hasToken ? 'Lưu & Cập nhật lên Web' : 'Lưu cấu hình thiệp';
  }

  function setStatusBanner(type, htmlMsg) {
    const el = $('saveStatusBanner');
    el.className = `status-banner ${type}`;
    el.innerHTML = htmlMsg;
    el.classList.remove('hidden');
  }

  function consumeSetupHash() {
    const rawHash = (window.location.hash || '').replace(/^#/, '');
    if (!rawHash) return { tab: null, autoConnected: false };
    const hp = new URLSearchParams(rawHash);
    const tab = hp.get('tab');
    const encodedKey = hp.get('k');
    let autoConnected = false;

    if (encodedKey) {
      const decoded = decodeTokenHash(encodedKey).trim();
      if (decoded) {
        try { localStorage.setItem(GH_TOKEN_KEY, decoded); } catch (_) {}
        autoConnected = true;
      }
      // Remove token from URL bar immediately for cleanliness & privacy
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (_) {}
    }
    return { tab: tab === 'bride' || tab === 'groom' ? tab : null, autoConnected };
  }

  function initSaveAndSync() {
    const savedTok = getSavedToken();
    if (savedTok) $('ghTokenInput').value = savedTok;
    updateSyncBadge();

    $('btnSaveToken').addEventListener('click', async () => {
      const tok = $('ghTokenInput').value.trim();
      if (!tok) {
        showToast('Vui lòng dán GitHub Token trước khi kết nối!');
        return;
      }
      const btn = $('btnSaveToken');
      btn.disabled = true;
      btn.textContent = 'Đang kiểm tra...';
      try {
        await WS.verifyGitHubToken(tok);
        try { localStorage.setItem(GH_TOKEN_KEY, tok); } catch (_) {}
        updateSyncBadge();
        setStatusBanner(
          'ok',
          '✅ Kết nối GitHub thành công! Từ giờ mỗi lần bấm <strong>Lưu &amp; Cập nhật lên Web</strong>, thiệp sẽ tự đồng bộ cho tất cả khách mời. Bạn có thể bấm nút <strong>Copy link gửi Cô Dâu</strong> ngay ở trên để gửi qua Zalo cho cô dâu tự sửa tab Nhà Gái!'
        );
        showToast('Kết nối GitHub thành công!');
      } catch (err) {
        setStatusBanner('err', `⚠️ Không thể kết nối Token: <strong>${escHtml(err.message)}</strong>`);
        showToast('Token chưa hợp lệ hoặc thiếu quyền ghi!');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kết nối';
      }
    });

    $('btnCopyBrideSetupLink').addEventListener('click', () => {
      const tok = getSavedToken();
      if (!tok) {
        showToast('Vui lòng kết nối GitHub Token trước!');
        return;
      }
      const cleanBase = `${window.location.origin}${window.location.pathname}`;
      const magicUrl = `${cleanBase}#tab=bride&k=${encodeTokenHash(tok)}`;
      copyText(magicUrl).then(() => {
        showToast('Đã copy link cấu hình gửi Cô Dâu — hãy dán gửi qua Zalo!');
      });
    });

    $('btnClearToken').addEventListener('click', () => {
      try { localStorage.removeItem(GH_TOKEN_KEY); } catch (_) {}
      $('ghTokenInput').value = '';
      updateSyncBadge();
      showToast('Đã ngắt kết nối GitHub Token khỏi máy này');
    });

    $('btnDownloadConfigJson').addEventListener('click', () => {
      const exportData = WS.mergeConfig(draft);
      exportData.updatedAt = Date.now();
      const blob = new Blob([JSON.stringify(exportData, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'config.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải xuống file config.json!');
    });

    $('btnResetDefaults').addEventListener('click', async () => {
      const ok = window.confirm('Khôi phục toàn bộ thông tin & hình ảnh về giá trị mặc định ban đầu của thiệp?');
      if (!ok) return;
      draft = WS.clone(WS.DEFAULT_CONFIG);
      dirty.forceFullReplace = true;
      await WS.clearLocalConfig();
      loadSideToForm(activeSide);
      renderAllPhotoSlots();
      syncSheetConnectionUI();
      loadGuestDb(1);
      setStatusBanner('warn', 'Đã khôi phục toàn bộ thông tin về giá trị mặc định ban đầu. Bấm <strong>Lưu &amp; Cập nhật lên Web</strong> nếu bạn muốn xuất bản bản mặc định cho mọi khách mời.');
      showToast('Đã khôi phục về mặc định!');
    });

    $('btnSaveAllConfig').addEventListener('click', async () => {
      const saveBtn = $('btnSaveAllConfig');
      const labelEl = $('btnSaveLabel');
      const token = getSavedToken();

      saveBtn.disabled = true;
      labelEl.textContent = 'Đang lưu...';

      try {
        draft.updatedAt = Date.now();
        await WS.saveLocalConfig(draft);

        if (token) {
          const hasAnyDirty = dirty.groom || dirty.bride || dirty.sheet || dirty.photoKeys.size > 0 || dirty.albumIndices.size > 0;
          const dirtyPayload = hasAnyDirty
            ? {
                groom: dirty.groom,
                bride: dirty.bride,
                sheet: dirty.sheet,
                photoKeys: Array.from(dirty.photoKeys),
                albumIndices: Array.from(dirty.albumIndices)
              }
            : null;

          const { config: published } = await WS.publishConfigToGitHub(draft, {
            token,
            dirty: dirtyPayload,
            forceFullReplace: dirty.forceFullReplace,
            onProgress: (step) => { labelEl.textContent = step; }
          });
          draft = published;
          resetDirty();
          loadSideToForm(activeSide);
          renderAllPhotoSlots();
          syncSheetConnectionUI();
          setStatusBanner(
            'ok',
            '✅ Đã lưu và đồng bộ trực tiếp lên <strong>GitHub</strong>! Cả 3 đường dẫn (<a href="../nha-trai/" target="_blank" style="text-decoration:underline;">Nhà Trai</a>, <a href="../nha-gai/" target="_blank" style="text-decoration:underline;">Nhà Gái</a>, <a href="../" target="_blank" style="text-decoration:underline;">Bản chung</a>) đã cập nhật ngay trên máy này và mọi khách mời sẽ xem được bản mới nhất sau ~30 giây.'
          );
          showToast('Đã lưu & đồng bộ lên GitHub thành công!');
        } else {
          setStatusBanner(
            'ok',
            '✅ Đã lưu cấu hình thành công trên máy này! Mở xem ngay: <a href="../nha-trai/" target="_blank" style="text-decoration:underline;">Thiệp Nhà Trai</a> · <a href="../nha-gai/" target="_blank" style="text-decoration:underline;">Thiệp Nhà Gái</a> · <a href="../" target="_blank" style="text-decoration:underline;">Bản chung (2 họ)</a>.<br/><span style="font-weight:500; color:var(--muted);">Để mọi khách mời trên điện thoại khác đều thấy thay đổi mới, hãy kết nối GitHub Token ở mục <strong>Đồng bộ lên Web</strong> bên trên (1 lần duy nhất).</span>'
          );
          showToast('Đã lưu cấu hình cho cả 3 link thiệp!');
        }
      } catch (err) {
        setStatusBanner(
          'err',
          `⚠️ Đã lưu xem trước trên máy này, nhưng đồng bộ lên GitHub gặp lỗi: <strong>${escHtml(err.message)}</strong>. Vui lòng kiểm tra lại GitHub Token.`
        );
        showToast('Lưu máy thành công, lỗi đồng bộ GitHub!');
      } finally {
        saveBtn.disabled = false;
        updateSyncBadge();
      }
    });
  }

  /* =========================================================================
     5. GUEST DATABASE LOOKUP (GOOGLE SHEET + 10 RECORDS/PAGE PAGINATION)
     ========================================================================= */
  let dbRequestSeq = 0;

  function setSheetConnectMsg(type, html) {
    const el = $('sheetConnectMsg');
    if (!el) return;
    if (!html) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    el.className = `status-banner ${type}`;
    el.innerHTML = html;
    el.classList.remove('hidden');
  }

  function syncSheetConnectionUI() {
    const viewUrl = draft.sheetViewUrl || WS.DEFAULT_CONFIG.sheetViewUrl;
    const apiUrl = String(draft.sheetApiUrl || '').trim();

    if ($('sheetOpenLink')) $('sheetOpenLink').href = viewUrl;
    if ($('btnOpenSheetQuick')) $('btnOpenSheetQuick').href = viewUrl;
    if ($('cfgSheetApiUrl')) $('cfgSheetApiUrl').value = apiUrl;

    const badge = $('sheetStatusBadge');
    if (badge) {
      if (apiUrl) {
        badge.textContent = 'Đã kết nối Google Sheet';
        badge.classList.add('connected');
      } else {
        badge.textContent = 'Chưa gắn Apps Script';
        badge.classList.remove('connected');
      }
    }
  }

  function renderGuestStats(stats) {
    const s = stats || {};
    if ($('statTotal')) $('statTotal').textContent = String(s.total || 0);
    if ($('statTypeSplit')) $('statTypeSplit').textContent = `${s.named || 0} riêng · ${s.walkin || 0} vãng lai`;
    if ($('statViewed')) $('statViewed').textContent = String(s.viewed || 0);
    if ($('statUnviewed')) $('statUnviewed').textContent = `${s.unviewed || 0} chưa mở`;
    if ($('statAttending')) $('statAttending').textContent = String(s.attending || 0);
    if ($('statEstPeople')) $('statEstPeople').textContent = `~${s.estPeople || 0} khách dự kiến`;
    if ($('statSideSplit')) $('statSideSplit').textContent = `${s.groom || 0} / ${s.bride || 0}`;
    if ($('statDeclined')) $('statDeclined').textContent = `${s.declined || 0} báo bận`;
  }

  function buildPageNumbers(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) pages.push('...');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  }

  function formatSourcePathLabel(sourceMode) {
    if (sourceMode === 'nha-trai') return '/nha-trai/';
    if (sourceMode === 'nha-gai') return '/nha-gai/';
    return '/ (Bản chung)';
  }

  function renderGuestDbResult(res, fallbackErrorMsg = '') {
    renderGuestStats(res.stats);

    const noteEl = $('dbSourceNote');
    if (noteEl) {
      if (res.source === 'google_sheet') {
        noteEl.innerHTML = `🟢 Đang tra cứu trực tiếp từ <strong>Google Sheet</strong> (${res.stats?.total || 0} bản ghi · tự động ghi nhận từ cả 3 link thiệp).`;
      } else if (fallbackErrorMsg) {
        noteEl.innerHTML = `⚠️ Không kết nối được Google Sheet (${escHtml(fallbackErrorMsg)}). Đang hiển thị tạm dữ liệu lưu trên máy này.`;
      } else {
        noteEl.innerHTML = '🟡 Đang tra cứu dữ liệu lưu tạm trên máy này. Hãy mở mục <strong>Kết nối Google Sheet</strong> phía trên và dán link Apps Script để đồng bộ realtime mọi khách mời vào Google Sheet.';
      }
    }

    const listEl = $('guestDbList');
    const pagerEl = $('guestDbPager');
    const numsEl = $('dbPageNumbers');
    const rangeEl = $('dbRangeSummary');

    const items = Array.isArray(res.items) ? res.items : [];
    const page = res.page || 1;
    const pageSize = res.pageSize || DB_PAGE_SIZE;
    const totalFiltered = res.totalFiltered || 0;
    const totalPages = res.totalPages || 1;

    if (!items.length) {
      const hasFilters = dbState.side !== 'all' || dbState.type !== 'all' || dbState.viewed !== 'all' || dbState.rsvp !== 'all' || Boolean(dbState.q);
      listEl.innerHTML = hasFilters
        ? '<div class="guest-db-empty">Không tìm thấy khách mời nào khớp bộ lọc hiện tại.<br/>Hãy thử xóa từ khóa hoặc chuyển bộ lọc về <strong>Tất cả</strong>.</div>'
        : '<div class="guest-db-empty">Chưa có bản ghi khách mời nào.<br/>Hãy tạo link khách mời ở <strong>Phần 1</strong> hoặc mở thử 1 trong 3 link thiệp (<code>/nha-trai/</code>, <code>/nha-gai/</code>, <code>/</code>) để xem hệ thống tự động ghi nhận!</div>';
      pagerEl.classList.add('hidden');
      rangeEl.textContent = '';
      return;
    }

    const startOffset = (page - 1) * pageSize;
    listEl.innerHTML = items.map((item, idx) => {
      const stt = startOffset + idx + 1;
      const isNamed = item.type === 'Link riêng';
      const sideCls = item.side === 'Nhà Trai' ? 'side-groom' : (item.side === 'Nhà Gái' ? 'side-bride' : 'side-both');
      const isViewed = item.viewed === 'Đã xem';
      const openCount = Number(item.openCount) || 0;
      const viewLabel = isViewed ? `Đã mở (${Math.max(1, openCount)} lần)` : 'Chưa mở thiệp';

      let rsvpCls = 'pending';
      let rsvpLabel = 'Chưa phản hồi';
      if (item.rsvpStatus === 'Sẽ tham dự') {
        rsvpCls = 'attending';
        rsvpLabel = `Sẽ tham dự${item.guestCount ? ` · ${item.guestCount}` : ''}`;
      } else if (item.rsvpStatus === 'Rất tiếc bận') {
        rsvpCls = 'declined';
        rsvpLabel = 'Rất tiếc bận';
      }

      const actionsHtml = item.link
        ? `<div class="grc-actions">
             <button type="button" class="mini-icon-btn" data-db-copy="${escHtml(item.link)}" title="Copy link thiệp" aria-label="Copy link thiệp">${COPY_SVG}</button>
             <a href="${escHtml(item.link)}" target="_blank" rel="noopener" class="mini-icon-btn" title="Mở link thiệp" aria-label="Mở link thiệp">${EXT_SVG}</a>
           </div>`
        : '';

      const metaParts = [
        `<span>Nguồn: <strong>${escHtml(formatSourcePathLabel(item.sourceMode))}</strong></span>`
      ];
      if (item.lastOpen) {
        metaParts.push(`<span>Mở gần nhất: ${escHtml(item.lastOpen)}</span>`);
      } else if (item.updatedAt) {
        metaParts.push(`<span>Tạo lúc: ${escHtml(item.updatedAt)}</span>`);
      }
      if (item.id) {
        metaParts.push(`<span>Mã: ${escHtml(item.id)}</span>`);
      }

      const wishHtml = item.wish
        ? `<p class="grc-wish">“${escHtml(item.wish)}”</p>`
        : '';

      return `
        <article class="guest-row-card" data-guest-id="${escHtml(item.id)}">
          <div class="grc-top">
            <div class="grc-title-wrap">
              <div class="grc-name"><span class="grc-stt">#${stt}</span>${escHtml(item.name || 'Khách vãng lai')}</div>
              <div class="grc-badges">
                <span class="g-badge ${isNamed ? 'named' : 'walkin'}">${isNamed ? 'Link riêng' : 'Vãng lai'}</span>
                <span class="g-badge ${sideCls}">${escHtml(item.side || 'Bản chung')}</span>
                <span class="g-badge ${isViewed ? 'viewed' : 'unviewed'}">${escHtml(viewLabel)}</span>
                <span class="g-badge ${rsvpCls}">${escHtml(rsvpLabel)}</span>
              </div>
            </div>
            ${actionsHtml}
          </div>
          <div class="grc-meta">${metaParts.join('')}</div>
          ${wishHtml}
        </article>
      `;
    }).join('');

    const fromIdx = startOffset + 1;
    const toIdx = startOffset + items.length;
    rangeEl.textContent = `Hiển thị ${fromIdx}–${toIdx} trên tổng ${totalFiltered} bản ghi (Trang ${page}/${totalPages} · ${pageSize} bản ghi/trang)`;

    if (totalPages > 1) {
      pagerEl.classList.remove('hidden');
      $('btnDbPrev').disabled = page <= 1;
      $('btnDbNext').disabled = page >= totalPages;

      const model = buildPageNumbers(page, totalPages);
      numsEl.innerHTML = model.map((p) => {
        if (p === '...') {
          return '<span style="padding:0 4px; color:var(--muted); font-weight:700;">…</span>';
        }
        return `<button type="button" class="pager-btn ${p === page ? 'active' : ''}" data-db-page="${p}" aria-label="Trang ${p}">${p}</button>`;
      }).join('');
    } else {
      pagerEl.classList.add('hidden');
      numsEl.innerHTML = '';
    }
  }

  async function loadGuestDb(targetPage) {
    const reqId = ++dbRequestSeq;
    if (typeof targetPage === 'number' && !Number.isNaN(targetPage)) {
      dbState.page = Math.max(1, targetPage);
    }

    const queryParams = {
      side: dbState.side,
      type: dbState.type,
      viewed: dbState.viewed,
      rsvp: dbState.rsvp,
      q: dbState.q,
      page: dbState.page,
      pageSize: DB_PAGE_SIZE
    };

    const apiUrl = String(draft.sheetApiUrl || '').trim();
    if (apiUrl && $('guestDbList') && !$('guestDbList').children.length) {
      $('guestDbList').innerHTML = '<div class="guest-db-empty">Đang tải danh sách khách mời từ Google Sheet...</div>';
    }

    try {
      const res = await WS.listSheetGuests(apiUrl, queryParams);
      if (reqId !== dbRequestSeq) return;
      dbState.page = res.page || 1;
      dbState.lastResult = res;
      renderGuestDbResult(res);
    } catch (err) {
      if (reqId !== dbRequestSeq) return;
      const localRes = WS.queryLocalGuests(queryParams);
      dbState.page = localRes.page || 1;
      dbState.lastResult = localRes;
      renderGuestDbResult(localRes, err.message);
    }
  }

  function initGuestDatabase() {
    // 1. Side filter tabs (Tất cả / Nhà Trai / Nhà Gái / Bản chung)
    document.querySelectorAll('[data-db-side]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-db-side]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        dbState.side = btn.dataset.dbSide || 'all';
        loadGuestDb(1);
      });
    });

    // 2. Dropdown filters
    $('dbFilterType')?.addEventListener('change', (e) => {
      dbState.type = e.target.value;
      loadGuestDb(1);
    });
    $('dbFilterViewed')?.addEventListener('change', (e) => {
      dbState.viewed = e.target.value;
      loadGuestDb(1);
    });
    $('dbFilterRsvp')?.addEventListener('change', (e) => {
      dbState.rsvp = e.target.value;
      loadGuestDb(1);
    });

    // 3. Debounced search
    $('dbSearchInput')?.addEventListener('input', (e) => {
      dbState.q = e.target.value.trim();
      clearTimeout(dbSearchTimer);
      dbSearchTimer = setTimeout(() => loadGuestDb(1), 220);
    });

    // 4. Refresh button
    $('btnRefreshGuestDb')?.addEventListener('click', () => {
      loadGuestDb(dbState.page);
      showToast('Đã làm mới danh sách khách mời!');
    });

    // 5. Pagination buttons
    $('btnDbPrev')?.addEventListener('click', () => {
      if (dbState.page > 1) {
        loadGuestDb(dbState.page - 1);
        $('secGuestDbTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    $('btnDbNext')?.addEventListener('click', () => {
      if (dbState.lastResult && dbState.page < dbState.lastResult.totalPages) {
        loadGuestDb(dbState.page + 1);
        $('secGuestDbTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    $('dbPageNumbers')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-db-page]');
      if (!btn) return;
      const p = parseInt(btn.dataset.dbPage, 10);
      if (p && p !== dbState.page) {
        loadGuestDb(p);
        $('secGuestDbTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // 6. Copy guest link from any card
    $('guestDbList')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-db-copy]');
      if (!btn) return;
      const link = btn.dataset.dbCopy;
      if (!link) return;
      copyText(link).then(() => {
        btn.innerHTML = CHECK_SVG;
        showToast('Đã copy link thiệp mời!');
        setTimeout(() => { btn.innerHTML = COPY_SVG; }, 1400);
      });
    });

    // 7. Copy Google Apps Script source code (1-click)
    $('btnCopyGasCode')?.addEventListener('click', async () => {
      const btn = $('btnCopyGasCode');
      btn.disabled = true;
      try {
        const res = await fetch(`${BASE}/scripts/google-apps-script.gs?v=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const code = await res.text();
        await copyText(code);
        setSheetConnectMsg('ok', '✅ Đã copy toàn bộ mã <strong>Google Apps Script</strong> vào bộ nhớ tạm! Hãy mở Google Sheet → <strong>Tiện ích mở rộng → Apps Script</strong> → dán đè toàn bộ và bấm Lưu → Triển khai.');
        showToast('Đã copy mã Google Apps Script!');
      } catch (err) {
        setSheetConnectMsg('err', `⚠️ Không thể tải mã Apps Script (${escHtml(err.message)}). Bạn có thể lấy trực tiếp từ file <code>scripts/google-apps-script.gs</code> trên GitHub.`);
      } finally {
        btn.disabled = false;
      }
    });

    // 8. Connect Google Apps Script Web App URL
    $('btnConnectSheet')?.addEventListener('click', async () => {
      const input = $('cfgSheetApiUrl');
      const btn = $('btnConnectSheet');
      const url = (input?.value || '').trim();

      if (!url) {
        if (draft.sheetApiUrl) {
          draft.sheetApiUrl = '';
          dirty.sheet = true;
          draft.updatedAt = Date.now();
          await WS.saveLocalConfig(draft);
          syncSheetConnectionUI();
          loadGuestDb(1);
          setSheetConnectMsg('warn', 'Đã ngắt link Google Apps Script trên máy này. Bấm <strong>Lưu &amp; Cập nhật lên Web</strong> nếu muốn gỡ khỏi bản công khai.');
          showToast('Đã ngắt kết nối Apps Script');
        } else {
          showToast('Vui lòng dán đường link Google Apps Script (.../exec) trước!');
          input?.focus();
        }
        return;
      }

      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/i.test(url)) {
        setSheetConnectMsg('err', '⚠️ Đường link chưa đúng định dạng Apps Script Web App (phải bắt đầu bằng <code>https://script.google.com/macros/s/...</code> và kết thúc bằng <code>/exec</code>).');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Đang kiểm tra...';
      setSheetConnectMsg('warn', 'Đang kiểm tra kết nối tới Google Sheet...');

      try {
        await WS.pingSheet(url);
        draft.sheetApiUrl = url;
        dirty.sheet = true;
        draft.updatedAt = Date.now();
        await WS.saveLocalConfig(draft);
        syncSheetConnectionUI();

        const tok = getSavedToken();
        if (tok) {
          btn.textContent = 'Đang đồng bộ Web...';
          const { config: published } = await WS.publishConfigToGitHub(draft, {
            token: tok,
            dirty: { groom: false, bride: false, sheet: true, photoKeys: [], albumIndices: [] }
          });
          draft = published;
          dirty.sheet = false;
          syncSheetConnectionUI();
          $('sheetConnectDetails')?.removeAttribute('open');
          setSheetConnectMsg('ok', '✅ <strong>Đã kết nối Google Sheet &amp; tự động đồng bộ lên cả 3 link thiệp!</strong> Từ giờ mọi khách mời mở thiệp hoặc xác nhận RSVP sẽ tự động lưu vào Google Sheet.');
          showToast('Kết nối Google Sheet & đồng bộ Web thành công!');
        } else {
          setSheetConnectMsg('ok', '✅ <strong>Kết nối Google Sheet thành công trên máy này!</strong> Hãy kết nối <strong>GitHub Token</strong> bên dưới và bấm <strong>Lưu &amp; Cập nhật lên Web</strong> để cả 3 link thiệp công khai cùng tự động ghi dữ liệu vào Google Sheet.');
          showToast('Kết nối Google Sheet thành công!');
        }

        await loadGuestDb(1);
      } catch (err) {
        setSheetConnectMsg('err', `⚠️ Chưa kết nối được Google Sheet: <strong>${escHtml(err.message)}</strong>.<br/>Hãy đảm bảo khi Triển khai (Deploy) đã chọn loại <strong>Ứng dụng web (Web app)</strong> và quyền truy cập là <strong>Bất kỳ ai (Anyone)</strong>.`);
        showToast('Lỗi kết nối Google Sheet!');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kết nối Sheet';
      }
    });

    // 9. Auto-refresh if another tab on the same browser writes guest data
    window.addEventListener('storage', (e) => {
      if (e.key === 'thiep_cuoi_guest_db_local_v1') {
        loadGuestDb(dbState.page);
      }
    });
  }

  /* =========================================================================
     INIT
     ========================================================================= */
  async function init() {
    const setupInfo = consumeSetupHash();

    populateTimeSelects();
    initLinkGenerator();
    initGuestDatabase();
    bindConfigFormEvents();
    initPhotoUploader();
    initSaveAndSync();

    const savedTok = getSavedToken();
    if (setupInfo.autoConnected) {
      $('githubSyncDetails').removeAttribute('open');
      const banner = $('autoConnectBanner');
      banner.innerHTML = '🎉 <strong>Đã tự động kết nối đồng bộ lên Web!</strong> Bạn chỉ cần chỉnh sửa thông tin ở tab <strong>Nhà Gái · Cô Dâu</strong> (và tải ảnh QR/album nếu muốn) rồi bấm <strong>Lưu &amp; Cập nhật lên Web</strong> bên dưới — toàn bộ khách mời sẽ tự động xem được bản mới nhất mà không làm mất thông tin Nhà Trai.';
      banner.classList.remove('hidden');
      showToast('Đã kết nối sẵn quyền đồng bộ cho Cô Dâu!');
    }

    // Load 2-level Vietnam units + freshest wedding config (prefer direct GitHub API when connected!)
    const [unitsRes, loaded, freshGh] = await Promise.all([
      fetch(`${BASE}/data/vn-units-2cap.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      WS.loadConfig(BASE),
      savedTok ? WS.fetchLatestGitHubConfig(savedTok) : Promise.resolve(null)
    ]);

    if (Array.isArray(unitsRes) && unitsRes.length) {
      vnUnits = unitsRes;
    }

    if (freshGh && (freshGh.updatedAt || 0) >= (loaded.config.updatedAt || 0)) {
      draft = freshGh;
    } else {
      draft = loaded.config;
    }

    loadSideToForm(setupInfo.tab || 'groom');
    renderAllPhotoSlots();
    syncSheetConnectionUI();
    loadGuestDb(1);

    if (setupInfo.tab === 'bride' && setupInfo.autoConnected) {
      setTimeout(() => {
        $('secConfigTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 450);
    }

    window.addEventListener('hashchange', () => {
      const next = consumeSetupHash();
      if (next.autoConnected) {
        $('ghTokenInput').value = getSavedToken();
        updateSyncBadge();
        $('githubSyncDetails').removeAttribute('open');
        const banner = $('autoConnectBanner');
        banner.innerHTML = '🎉 <strong>Đã tự động kết nối đồng bộ lên Web!</strong> Bạn chỉ cần chỉnh sửa thông tin ở tab <strong>Nhà Gái · Cô Dâu</strong> (và tải ảnh QR/album nếu muốn) rồi bấm <strong>Lưu &amp; Cập nhật lên Web</strong> bên dưới — toàn bộ khách mời sẽ tự động xem được bản mới nhất mà không làm mất thông tin Nhà Trai.';
        banner.classList.remove('hidden');
        showToast('Đã kết nối sẵn quyền đồng bộ cho Cô Dâu!');
      }
      if (next.tab) loadSideToForm(next.tab);
    });
  }

  init();
})();
