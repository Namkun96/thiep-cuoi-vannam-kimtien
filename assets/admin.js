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
  const SB = window.WeddingSupabase;
  const BASE = '..';
  const HISTORY_KEY = 'thiep_cuoi_guest_link_history_v1';
  const GH_TOKEN_KEY = 'thiep_cuoi_gh_token_v1';

  const $ = (id) => document.getElementById(id);

  const FEATURED_SLOTS = [
    { key: 'hero', label: 'Ảnh bìa đầu trang (Hero)', sub: 'Khung mở đầu toàn màn hình', scope: 'both' },
    { key: 'interlude', label: 'Ảnh “Forever & Always”', sub: 'Ảnh ngang dưới phong bì', scope: 'both' },
    { key: 'polaroidGroom', label: 'Ảnh Polaroid Chú Rể', sub: 'Khung “The Groom”', scope: 'groom' },
    { key: 'polaroidBride', label: 'Ảnh Polaroid Cô Dâu', sub: 'Khung “The Bride”', scope: 'bride' },
    { key: 'vinylLabel', label: 'Ảnh tâm đĩa nhạc Vinyl', sub: 'Ảnh tròn giữa đĩa nhạc', scope: 'both' },
    { key: 'footerBg', label: 'Ảnh nền lời cảm ơn', sub: 'Ảnh nền mục “Thank you!”', scope: 'both' }
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
    supabase: false,
    photoKeys: new Set(),
    albumIndices: new Set(),
    forceFullReplace: false
  };

  let authState = {
    mode: 'open_admin', // 'open_admin' | 'login_required' | 'authenticated'
    role: 'admin',      // 'admin' | 'groom' | 'bride'
    session: null,
    profile: null,
    remoteGhToken: '',
    firstAdminRegMode: false
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
    dirty = { groom: false, bride: false, sheet: false, supabase: false, photoKeys: new Set(), albumIndices: new Set(), forceFullReplace: false };
  }

  function getRoleScope() {
    if (authState.role === 'groom') return 'groom';
    if (authState.role === 'bride') return 'bride';
    return 'all';
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

  function isLinkSideAllowed(side) {
    if (authState.role === 'groom') return side === 'nha-trai' || side === 'both';
    if (authState.role === 'bride') return side === 'nha-gai' || side === 'both';
    return true;
  }

  function renderHistory() {
    const list = loadHistory().filter((item) => isLinkSideAllowed(item.side));
    const wrap = $('linkHistoryWrap');
    const container = $('linkHistoryList');
    if (!list.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    container.innerHTML = list.map((item) => {
      const sideLabel = item.side === 'nha-trai' ? 'Nhà Trai' : (item.side === 'nha-gai' ? 'Nhà Gái' : 'Bản 2 họ');
      return `
        <div class="history-item">
          <div class="history-meta">
            <div class="history-name">${escHtml(item.guest)} <span style="color:var(--gold); font-weight:600; font-size:11.5px;">· ${sideLabel}</span></div>
            <div class="history-sub">${escHtml(item.url)}</div>
          </div>
          <div class="history-actions">
            <button type="button" class="mini-icon-btn" data-hist-url="${escHtml(item.url)}" data-hist-guest="${escHtml(item.guest)}" title="Copy link" aria-label="Copy link">${COPY_SVG}</button>
            <a href="${escHtml(item.url)}" target="_blank" rel="noopener" class="mini-icon-btn" title="Mở thiệp" aria-label="Mở thiệp">${EXT_SVG}</a>
          </div>
        </div>
      `;
    }).join('');
  }

  function generateGuestLink(side) {
    if (!isLinkSideAllowed(side)) {
      showToast('Tài khoản của bạn không có quyền tạo link phía nhà còn lại.');
      return;
    }
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
        const fallbackSide = authState.role === 'bride' ? 'nha-gai' : 'nha-trai';
        generateGuestLink(isLinkSideAllowed(lastSideCreated) ? lastSideCreated : fallbackSide);
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
      const btn = e.target.closest('[data-hist-url]');
      if (!btn) return;
      const url = btn.dataset.histUrl;
      const guest = btn.dataset.histGuest || '';
      if (!url) return;
      copyText(url).then(() => {
        btn.innerHTML = CHECK_SVG;
        showToast(`Đã copy link của ${guest}!`);
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
    const visibleFeatured = FEATURED_SLOTS.filter((s) => {
      if (authState.role === 'groom' && s.scope === 'bride') return false;
      if (authState.role === 'bride' && s.scope === 'groom') return false;
      return true;
    });
    featGrid.innerHTML = visibleFeatured.map((s) => `<div class="photo-slot" data-photo-slot="${s.key}"></div>`).join('');
    visibleFeatured.forEach((s) => {
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

  function getEffectiveToken() {
    if (authState.role === 'admin') {
      return getSavedToken() || authState.remoteGhToken || '';
    }
    // Groom & Bride silently use protected token from Supabase app_settings (never exposed in UI)
    return authState.remoteGhToken || getSavedToken() || '';
  }

  function updateSyncBadge() {
    const hasLocalToken = Boolean(getSavedToken());
    const hasEffectiveToken = Boolean(getEffectiveToken());
    const badge = $('syncStatusBadge');
    if (badge) {
      badge.textContent = hasEffectiveToken ? 'Đã kết nối GitHub' : 'Lưu trên máy này';
      badge.classList.toggle('connected', hasEffectiveToken);
    }
    $('btnClearToken')?.classList.toggle('hidden', !hasLocalToken);
    $('shareBrideSetupBox')?.classList.toggle('hidden', !hasLocalToken);
    if ($('btnSaveLabel')) {
      $('btnSaveLabel').textContent = hasEffectiveToken ? 'Lưu & Cập nhật lên Web' : 'Lưu cấu hình thiệp';
    }
  }

  function setStatusBanner(type, htmlMsg) {
    const el = $('saveStatusBanner');
    if (!el) return;
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
    if (savedTok && $('ghTokenInput')) $('ghTokenInput').value = savedTok;
    updateSyncBadge();

    $('btnSaveToken')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
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
        authState.remoteGhToken = tok;

        // If Supabase is active & logged in as Admin, store token securely in app_settings so Groom/Bride auto-sync silently
        let savedToCloud = false;
        if (SB && SB.isConfigured(draft) && authState.session && authState.role === 'admin') {
          try {
            await SB.setAppSetting(draft, authState.session, 'github_token', tok);
            savedToCloud = true;
          } catch (_) {}
        }

        updateSyncBadge();
        setStatusBanner(
          'ok',
          savedToCloud
            ? '✅ Kết nối GitHub thành công &amp; đã đồng bộ bảo mật vào Supabase! Từ giờ cả <strong>Admin, Chú rể và Cô dâu</strong> chỉ cần bấm <strong>Lưu &amp; Cập nhật lên Web</strong> là tự xuất bản mà không cần nhập Token.'
            : '✅ Kết nối GitHub thành công! Từ giờ mỗi lần bấm <strong>Lưu &amp; Cập nhật lên Web</strong>, thiệp sẽ tự đồng bộ cho tất cả khách mời.'
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

    $('btnCopyBrideSetupLink')?.addEventListener('click', () => {
      if (authState.role !== 'admin') return;
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

    $('btnClearToken')?.addEventListener('click', () => {
      if (authState.role !== 'admin') return;
      try { localStorage.removeItem(GH_TOKEN_KEY); } catch (_) {}
      $('ghTokenInput').value = '';
      updateSyncBadge();
      showToast('Đã ngắt kết nối GitHub Token khỏi máy này');
    });

    $('btnDownloadConfigJson')?.addEventListener('click', () => {
      if (authState.role !== 'admin') return;
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

    $('btnResetDefaults')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
      const ok = window.confirm('Khôi phục toàn bộ thông tin & hình ảnh về giá trị mặc định ban đầu của thiệp?');
      if (!ok) return;
      draft = WS.clone(WS.DEFAULT_CONFIG);
      dirty.forceFullReplace = true;
      await WS.clearLocalConfig();
      loadSideToForm(activeSide);
      renderAllPhotoSlots();
      syncSheetConnectionUI();
      syncSupabaseConnectionUI();
      loadGuestDb(1);
      setStatusBanner('warn', 'Đã khôi phục toàn bộ thông tin về giá trị mặc định ban đầu. Bấm <strong>Lưu &amp; Cập nhật lên Web</strong> nếu bạn muốn xuất bản bản mặc định cho mọi khách mời.');
      showToast('Đã khôi phục về mặc định!');
    });

    $('btnSaveAllConfig').addEventListener('click', async () => {
      const saveBtn = $('btnSaveAllConfig');
      const labelEl = $('btnSaveLabel');
      const token = getEffectiveToken();
      const isAdmin = authState.role === 'admin';

      saveBtn.disabled = true;
      labelEl.textContent = 'Đang lưu...';

      try {
        draft.updatedAt = Date.now();
        await WS.saveLocalConfig(draft);

        if (token) {
          // Enforce role-strict dirty flags so Groom can never touch Bride & Bride can never touch Groom
          const allowGroom = isAdmin || authState.role === 'groom';
          const allowBride = isAdmin || authState.role === 'bride';
          const dirtyGroom = allowGroom && dirty.groom;
          const dirtyBride = allowBride && dirty.bride;
          const dirtySheet = isAdmin && dirty.sheet;
          const dirtySupabase = isAdmin && dirty.supabase;

          const hasAnyDirty = dirtyGroom || dirtyBride || dirtySheet || dirtySupabase || dirty.photoKeys.size > 0 || dirty.albumIndices.size > 0;
          const dirtyPayload = hasAnyDirty
            ? {
                groom: dirtyGroom,
                bride: dirtyBride,
                sheet: dirtySheet,
                supabase: dirtySupabase,
                photoKeys: Array.from(dirty.photoKeys),
                albumIndices: Array.from(dirty.albumIndices)
              }
            : null;

          const { config: published } = await WS.publishConfigToGitHub(draft, {
            token,
            dirty: dirtyPayload,
            forceFullReplace: isAdmin && dirty.forceFullReplace,
            onProgress: (step) => {
              labelEl.textContent = isAdmin ? step : 'Đang cập nhật lên thiệp cưới...';
            }
          });
          draft = published;
          resetDirty();
          loadSideToForm(activeSide);
          renderAllPhotoSlots();
          syncSheetConnectionUI();
          syncSupabaseConnectionUI();

          if (isAdmin) {
            setStatusBanner(
              'ok',
              '✅ Đã lưu và đồng bộ trực tiếp lên <strong>GitHub</strong>! Cả 3 đường dẫn (<a href="../nha-trai/" target="_blank" style="text-decoration:underline;">Nhà Trai</a>, <a href="../nha-gai/" target="_blank" style="text-decoration:underline;">Nhà Gái</a>, <a href="../" target="_blank" style="text-decoration:underline;">Bản chung</a>) đã cập nhật ngay trên máy này và mọi khách mời sẽ xem được bản mới nhất sau ~30 giây.'
            );
            showToast('Đã lưu & đồng bộ lên GitHub thành công!');
          } else {
            const ownLink = authState.role === 'groom'
              ? '<a href="../nha-trai/" target="_blank" style="text-decoration:underline;">Thiệp Nhà Trai</a> · <a href="../" target="_blank" style="text-decoration:underline;">Bản chung</a>'
              : '<a href="../nha-gai/" target="_blank" style="text-decoration:underline;">Thiệp Nhà Gái</a> · <a href="../" target="_blank" style="text-decoration:underline;">Bản chung</a>';
            setStatusBanner(
              'ok',
              `✅ <strong>Đã lưu và cập nhật thiệp cưới thành công!</strong> Mở xem ngay: ${ownLink} (mọi khách mời sẽ thấy bản mới nhất sau ~30 giây).`
            );
            showToast('Đã lưu & cập nhật thiệp cưới thành công!');
          }
        } else {
          if (isAdmin) {
            setStatusBanner(
              'ok',
              '✅ Đã lưu cấu hình thành công trên máy này!<br/><span style="font-weight:500; color:var(--muted);">Để mọi khách mời trên điện thoại khác đều thấy thay đổi mới, hãy mở <strong>Phần 5 → Đồng bộ lên Web</strong> và kết nối GitHub Token (1 lần duy nhất).</span>'
            );
          } else {
            setStatusBanner(
              'ok',
              '✅ Đã lưu cấu hình tạm trên máy này. Hãy báo quản trị viên (Admin) bật đồng bộ Web để cập nhật công khai cho khách mời.'
            );
          }
          showToast('Đã lưu cấu hình thiệp!');
        }
      } catch (err) {
        if (isAdmin) {
          setStatusBanner(
            'err',
            `⚠️ Đã lưu xem trước trên máy này, nhưng đồng bộ lên GitHub gặp lỗi: <strong>${escHtml(err.message)}</strong>. Vui lòng kiểm tra lại GitHub Token.`
          );
        } else {
          setStatusBanner(
            'err',
            '⚠️ Đã lưu tạm trên máy này nhưng tạm thời chưa cập nhật được lên mạng. Vui lòng thử lại sau ít phút hoặc báo Admin kiểm tra.'
          );
        }
        showToast('Có lỗi khi cập nhật lên Web!');
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
    if ($('accGuestCountPill')) $('accGuestCountPill').textContent = String(s.total || 0);
    if ($('statTypeSplit')) $('statTypeSplit').textContent = `${s.named || 0} riêng · ${s.walkin || 0} vãng lai`;
    if ($('statViewed')) $('statViewed').textContent = String(s.viewed || 0);
    if ($('statUnviewed')) $('statUnviewed').textContent = `${s.unviewed || 0} chưa mở`;
    if ($('statAttending')) $('statAttending').textContent = String(s.attending || 0);
    if ($('statEstPeople')) $('statEstPeople').textContent = `~${s.estPeople || 0} khách dự kiến`;

    if (authState.role === 'groom') {
      if ($('statSideSplitLbl')) $('statSideSplitLbl').textContent = 'Trai / Chung';
      if ($('statSideSplit')) $('statSideSplit').textContent = `${s.groom || 0} / ${s.both || 0}`;
    } else if (authState.role === 'bride') {
      if ($('statSideSplitLbl')) $('statSideSplitLbl').textContent = 'Gái / Chung';
      if ($('statSideSplit')) $('statSideSplit').textContent = `${s.bride || 0} / ${s.both || 0}`;
    } else {
      if ($('statSideSplitLbl')) $('statSideSplitLbl').textContent = 'Nhà Trai / Gái';
      if ($('statSideSplit')) $('statSideSplit').textContent = `${s.groom || 0} / ${s.bride || 0}`;
    }
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
      if (authState.role !== 'admin') {
        const scopeLabel = authState.role === 'groom' ? 'Nhà Trai &amp; Bản chung' : 'Nhà Gái &amp; Bản chung';
        noteEl.innerHTML = `🟢 Đang hiển thị danh sách khách mời thuộc <strong>${scopeLabel}</strong> (${res.stats?.total || 0} bản ghi · tự động cập nhật khi khách mở thiệp hoặc xác nhận).`;
      } else if (res.source === 'google_sheet') {
        noteEl.innerHTML = `🟢 Đang tra cứu trực tiếp từ <strong>Google Sheet</strong> (${res.stats?.total || 0} bản ghi · tự động ghi nhận từ cả 3 link thiệp).`;
      } else if (fallbackErrorMsg) {
        noteEl.innerHTML = `⚠️ Không kết nối được Google Sheet (${escHtml(fallbackErrorMsg)}). Đang hiển thị tạm dữ liệu lưu trên máy này.`;
      } else {
        noteEl.innerHTML = '🟡 Đang tra cứu dữ liệu lưu tạm trên máy này. Hãy mở <strong>Phần 5 → Kết nối Google Sheet</strong> để đồng bộ realtime vào Google Sheet.';
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
    if (authState.mode === 'login_required') return;
    const reqId = ++dbRequestSeq;
    if (typeof targetPage === 'number' && !Number.isNaN(targetPage)) {
      dbState.page = Math.max(1, targetPage);
    }

    const queryParams = {
      scope: getRoleScope(),
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
      $('guestDbList').innerHTML = '<div class="guest-db-empty">Đang tải danh sách khách mời...</div>';
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
    // 1. Side filter tabs (delegated so dynamic role tabs work cleanly)
    $('dbSideTabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-db-side]');
      if (!btn) return;
      $('dbSideTabs').querySelectorAll('[data-db-side]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      dbState.side = btn.dataset.dbSide || 'all';
      loadGuestDb(1);
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

    // 7. Copy Google Apps Script source code (1-click, Admin only)
    $('btnCopyGasCode')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
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

    // 8. Connect Google Apps Script Web App URL (Admin only)
    $('btnConnectSheet')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
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

        const tok = getEffectiveToken();
        if (tok) {
          btn.textContent = 'Đang đồng bộ Web...';
          const { config: published } = await WS.publishConfigToGitHub(draft, {
            token: tok,
            dirty: { groom: false, bride: false, sheet: true, supabase: false, photoKeys: [], albumIndices: [] }
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
     6. SUPABASE AUTH, ROLE-BASED PERMISSIONS (ADMIN / GROOM / BRIDE) & USER CRUD
     ========================================================================= */
  function collapseAllMajorPanels() {
    document.querySelectorAll('details.panel-acc').forEach((d) => {
      d.removeAttribute('open');
    });
  }

  function setAuthGateMsg(type, html) {
    const el = $('authGateMsg');
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

  function setSupabaseConnectMsg(type, html) {
    const el = $('supabaseConnectMsg');
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

  function setUserMgmtMsg(type, html) {
    const el = $('userMgmtMsg');
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

  function syncSupabaseConnectionUI() {
    const configured = SB && SB.isConfigured(draft);
    if ($('cfgSupabaseUrl')) $('cfgSupabaseUrl').value = draft.supabaseUrl || '';
    if ($('cfgSupabaseAnonKey')) $('cfgSupabaseAnonKey').value = draft.supabaseAnonKey || '';

    const badge = $('supabaseStatusBadge');
    if (badge) {
      badge.textContent = configured ? 'Đã kết nối Supabase' : 'Chưa kết nối';
      badge.classList.toggle('connected', Boolean(configured));
    }
    $('btnDisconnectSupabase')?.classList.toggle('hidden', !configured);

    const canManageUsers = Boolean(configured && authState.mode === 'authenticated' && authState.role === 'admin' && authState.session);
    $('userMgmtPanel')?.classList.toggle('hidden', !canManageUsers);
  }

  function renderSessionBar() {
    const bar = $('sessionBar');
    const pill = $('sessionRolePill');
    const nameEl = $('sessionUserName');
    const btnSignOut = $('btnSignOut');
    const btnQuickSb = $('btnOpenSupabaseQuick');
    if (!bar) return;

    if (authState.mode === 'login_required') {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    if (authState.mode === 'open_admin') {
      pill.className = 'role-pill admin';
      pill.textContent = 'Admin';
      nameEl.textContent = 'Chưa bật đăng nhập';
      btnSignOut?.classList.add('hidden');
      btnQuickSb?.classList.remove('hidden');
      return;
    }

    const roleMap = {
      admin: { cls: 'admin', label: 'Admin' },
      groom: { cls: 'groom', label: 'Chú rể' },
      bride: { cls: 'bride', label: 'Cô dâu' }
    };
    const r = roleMap[authState.role] || roleMap.groom;
    pill.className = `role-pill ${r.cls}`;
    pill.textContent = r.label;
    nameEl.textContent = authState.profile?.full_name || authState.profile?.email || r.label;
    btnSignOut?.classList.remove('hidden');
    btnQuickSb?.classList.add('hidden');
  }

  function renderScopedDbSideTabs(role) {
    const container = $('dbSideTabs');
    if (!container) return;
    if (role === 'groom') {
      container.classList.add('cols-3');
      container.innerHTML = `
        <button type="button" class="db-side-tab active" data-db-side="groom_both">Tất cả</button>
        <button type="button" class="db-side-tab" data-db-side="groom">Nhà Trai</button>
        <button type="button" class="db-side-tab" data-db-side="both">Bản chung</button>
      `;
      dbState.side = 'groom_both';
    } else if (role === 'bride') {
      container.classList.add('cols-3');
      container.innerHTML = `
        <button type="button" class="db-side-tab active" data-db-side="bride_both">Tất cả</button>
        <button type="button" class="db-side-tab" data-db-side="bride">Nhà Gái</button>
        <button type="button" class="db-side-tab" data-db-side="both">Bản chung</button>
      `;
      dbState.side = 'bride_both';
    } else {
      container.classList.remove('cols-3');
      container.innerHTML = `
        <button type="button" class="db-side-tab active" data-db-side="all">Tất cả</button>
        <button type="button" class="db-side-tab" data-db-side="groom">Nhà Trai</button>
        <button type="button" class="db-side-tab" data-db-side="bride">Nhà Gái</button>
        <button type="button" class="db-side-tab" data-db-side="both">Bản chung</button>
      `;
      dbState.side = 'all';
    }
  }

  function applyRolePermissions(preferredTab) {
    const role = authState.role;
    const isAdmin = role === 'admin';
    const isGroom = role === 'groom';
    const isBride = role === 'bride';

    // 1. Toggle Auth Gate vs Workspace
    const showLogin = authState.mode === 'login_required';
    $('authGateSection')?.classList.toggle('hidden', !showLogin);
    $('studioWorkspace')?.classList.toggle('hidden', showLogin);
    $('stickySaveBar')?.classList.toggle('hidden', showLogin);
    $('quickPreviewRow')?.classList.toggle('hidden', showLogin);

    renderSessionBar();
    if (showLogin) return;

    // 2. Admin-only elements (Phần 5, Reset Defaults, Raw Google Sheet link...)
    document.querySelectorAll('[data-admin-only="true"]').forEach((el) => {
      el.classList.toggle('hidden', !isAdmin);
    });

    // 3. Header Quick Preview Links
    document.querySelectorAll('[data-preview-side]').forEach((a) => {
      const s = a.dataset.previewSide;
      const allowed = isAdmin || s === 'both' || (isGroom && s === 'groom') || (isBride && s === 'bride');
      a.classList.toggle('hidden', !allowed);
    });

    // 4. Phần 1: Guest Link Generator buttons & description
    $('btnCreateGroomLink')?.classList.toggle('hidden', isBride);
    $('btnCreateBrideLink')?.classList.toggle('hidden', isGroom);
    $('linkBtnRow')?.classList.toggle('single-col', isGroom || isBride);
    if (isGroom) {
      lastSideCreated = 'nha-trai';
      if ($('linkGenDesc')) $('linkGenDesc').textContent = 'Nhập tên khách mời để tạo link thiệp Nhà Trai hoặc bản chung (2 họ). Tên khách sẽ tự hiển thị trang trọng trên thiệp.';
    } else if (isBride) {
      lastSideCreated = 'nha-gai';
      if ($('linkGenDesc')) $('linkGenDesc').textContent = 'Nhập tên khách mời để tạo link thiệp Nhà Gái hoặc bản chung (2 họ). Tên khách sẽ tự hiển thị trang trọng trên thiệp.';
    } else {
      if ($('linkGenDesc')) $('linkGenDesc').textContent = 'Nhập tên khách muốn mời rồi chọn Nhà Trai, Nhà Gái hoặc bản chung. Tên khách sẽ tự động hiển thị trang trọng trên thiệp.';
    }
    $('linkResultBox')?.classList.add('hidden');
    renderHistory();

    // 5. Phần 2: Guest DB Tabs scoped to role
    renderScopedDbSideTabs(role);

    // 6. Phần 3: Config Form side tabs locked for Groom / Bride
    $('configSideTabs')?.classList.toggle('hidden', !isAdmin);
    if (isGroom) {
      if ($('secConfigSub')) $('secConfigSub').textContent = 'Thông tin Nhà Trai: Họ tên mẹ, địa chỉ tư gia, ngày giờ tiệc/lễ & mã QR';
      if ($('configScopeDesc')) $('configScopeDesc').innerHTML = 'Chỉnh sửa thông tin <strong>Nhà Trai</strong>. Khi bấm <strong>Lưu</strong> bên dưới, thiệp Nhà Trai và bản chung sẽ tự động cập nhật đồng bộ.';
      loadSideToForm('groom');
    } else if (isBride) {
      if ($('secConfigSub')) $('secConfigSub').textContent = 'Thông tin Nhà Gái: Họ tên mẹ, địa chỉ tư gia, ngày giờ tiệc/lễ & mã QR';
      if ($('configScopeDesc')) $('configScopeDesc').innerHTML = 'Chỉnh sửa thông tin <strong>Nhà Gái</strong>. Khi bấm <strong>Lưu</strong> bên dưới, thiệp Nhà Gái và bản chung sẽ tự động cập nhật đồng bộ.';
      loadSideToForm('bride');
    } else {
      if ($('secConfigSub')) $('secConfigSub').textContent = 'Họ tên mẹ, địa chỉ tư gia, ngày giờ tiệc/lễ & mã QR mừng cưới';
      if ($('configScopeDesc')) $('configScopeDesc').innerHTML = 'Chọn tab <strong>Nhà Trai</strong> hoặc <strong>Nhà Gái</strong> để chỉnh sửa thông tin tương ứng. Khi bấm <strong>Lưu</strong>, cả 3 link thiệp sẽ tự động cập nhật đồng bộ.';
      loadSideToForm(preferredTab || activeSide || 'groom');
    }

    // 7. Phần 4: Role-scoped Featured Photos + Shared Album
    renderAllPhotoSlots();

    // 8. Sync Admin UI & Load Role-scoped Guest DB
    syncSheetConnectionUI();
    syncSupabaseConnectionUI();
    updateSyncBadge();
    loadGuestDb(1);
    if (isAdmin && authState.mode === 'authenticated') {
      loadUsersList();
    }
  }

  async function renderUsersList(users) {
    const container = $('usersListContainer');
    if (!container) return;
    if (!Array.isArray(users) || !users.length) {
      container.innerHTML = '<div class="guest-db-empty">Chưa có tài khoản nào trong Supabase.</div>';
      return;
    }

    const myId = authState.profile?.id || authState.session?.user?.id || '';
    const roleBadgeMap = {
      admin: { cls: 'admin', label: 'Admin' },
      groom: { cls: 'groom', label: 'Chú rể' },
      bride: { cls: 'bride', label: 'Cô dâu' }
    };

    container.innerHTML = users.map((u) => {
      const rb = roleBadgeMap[u.role] || roleBadgeMap.groom;
      const isSelf = u.id === myId;
      const isActive = Boolean(u.is_active);
      return `
        <div class="user-row-card" data-user-id="${escHtml(u.id)}">
          <div class="user-row-top">
            <div style="min-width:0;">
              <div class="user-row-name">${escHtml(u.full_name || u.email)} ${isSelf ? '<span style="color:var(--gold); font-size:11px;">(Bạn)</span>' : ''}</div>
              <div class="user-row-email">${escHtml(u.email)}</div>
            </div>
            <span class="role-pill ${rb.cls}">${rb.label}</span>
          </div>
          <div class="user-row-controls">
            <select class="select user-role-select" data-user-role-sel="${escHtml(u.id)}" ${isSelf ? 'disabled title="Không thể tự đổi quyền Admin của chính mình"' : ''}>
              <option value="groom" ${u.role === 'groom' ? 'selected' : ''}>Chú rể (Nhà Trai + Chung)</option>
              <option value="bride" ${u.role === 'bride' ? 'selected' : ''}>Cô dâu (Nhà Gái + Chung)</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin (Toàn quyền)</option>
            </select>
            <button type="button" class="user-ctrl-btn ${isActive ? 'active-ok' : 'locked'}" data-user-toggle-active="${escHtml(u.id)}" data-cur-active="${isActive ? '1' : '0'}" ${isSelf ? 'disabled' : ''}>
              ${isActive ? 'Đang mở' : 'Đang khóa'}
            </button>
            ${!isSelf ? `<button type="button" class="user-ctrl-btn" data-user-delete="${escHtml(u.id)}" data-user-email="${escHtml(u.email)}" title="Xóa hồ sơ phân quyền">Xóa</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadUsersList() {
    if (!SB || !SB.isConfigured(draft) || !authState.session || authState.role !== 'admin') return;
    const container = $('usersListContainer');
    if (container && !container.children.length) {
      container.innerHTML = '<div class="guest-db-empty">Đang tải danh sách tài khoản...</div>';
    }
    try {
      const users = await SB.listUsers(draft, authState.session);
      renderUsersList(users);
    } catch (err) {
      if (container) {
        container.innerHTML = `<div class="guest-db-empty">Không tải được danh sách user: ${escHtml(err.message)}</div>`;
      }
    }
  }

  async function activateAuthenticatedSession(session, preferredTab) {
    const profile = await SB.getCurrentProfile(draft, session);
    if (!profile) {
      await SB.signOut(draft, session);
      throw new Error('Không tìm thấy hồ sơ phân quyền cho tài khoản này trong bảng user_profiles.');
    }
    if (!profile.is_active) {
      await SB.signOut(draft, session);
      throw new Error('Tài khoản của bạn đang bị khóa hoặc chưa được Admin kích hoạt.');
    }

    authState.mode = 'authenticated';
    authState.session = session;
    authState.profile = profile;
    authState.role = profile.role || 'groom';

    // Load protected GitHub token from Supabase app_settings for silent sync
    const settings = await SB.getAppSettings(draft, session);
    authState.remoteGhToken = String(settings.github_token || '').trim();

    // If Admin has a local GitHub token not yet pushed to Supabase app_settings, sync it automatically!
    const localTok = getSavedToken();
    if (authState.role === 'admin' && localTok && !authState.remoteGhToken) {
      try {
        await SB.setAppSetting(draft, session, 'github_token', localTok);
        authState.remoteGhToken = localTok;
      } catch (_) {}
    }

    // If we now have an effective token, pull the freshest config from GitHub too
    const effTok = getEffectiveToken();
    if (effTok) {
      const freshGh = await WS.fetchLatestGitHubConfig(effTok);
      if (freshGh && (freshGh.updatedAt || 0) > (draft.updatedAt || 0)) {
        draft = freshGh;
      }
    }

    collapseAllMajorPanels();
    applyRolePermissions(preferredTab);
  }

  async function refreshLoginGateMode() {
    if (!SB || !SB.isConfigured(draft)) return;
    const hasAdmin = await SB.hasAnyAdmin(draft);
    const toggleBtn = $('btnToggleFirstAdmin');
    if (!hasAdmin) {
      authState.firstAdminRegMode = true;
      toggleBtn?.classList.add('hidden');
      $('authFirstAdminNameGroup')?.classList.remove('hidden');
      if ($('authGateTitle')) $('authGateTitle').textContent = 'Tạo Tài Khoản Admin Đầu Tiên';
      if ($('authGateDesc')) $('authGateDesc').textContent = 'Hệ thống Supabase vừa kết nối chưa có Admin. Hãy tạo tài khoản quản trị đầu tiên của bạn (sẽ tự động nhận quyền Admin toàn quyền).';
      if ($('authSubmitLabel')) $('authSubmitLabel').textContent = 'Tạo tài khoản Admin & Đăng nhập';
    } else {
      authState.firstAdminRegMode = false;
      toggleBtn?.classList.add('hidden');
      $('authFirstAdminNameGroup')?.classList.add('hidden');
      if ($('authGateTitle')) $('authGateTitle').textContent = 'Đăng Nhập Trang Quản Lý Thiệp Cưới';
      if ($('authGateDesc')) $('authGateDesc').textContent = 'Vui lòng đăng nhập bằng tài khoản được cấp (Admin, Chú rể hoặc Cô dâu) để tiếp tục thao tác.';
      if ($('authSubmitLabel')) $('authSubmitLabel').textContent = 'Đăng nhập';
    }
  }

  function initSupabaseAndAuth() {
    // Quick button in header (when Supabase is not yet set up) -> open Phần 5 directly
    $('btnOpenSupabaseQuick')?.addEventListener('click', () => {
      const sec5 = $('secAdminSystem');
      const sbDetails = $('supabaseSetupDetails');
      if (sec5) sec5.setAttribute('open', '');
      if (sbDetails) sbDetails.setAttribute('open', '');
      sec5?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Sign out
    $('btnSignOut')?.addEventListener('click', async () => {
      await SB.signOut(draft, authState.session);
      authState.session = null;
      authState.profile = null;
      authState.remoteGhToken = '';
      authState.mode = 'login_required';
      authState.role = 'groom';
      collapseAllMajorPanels();
      applyRolePermissions();
      await refreshLoginGateMode();
      setAuthGateMsg('ok', 'Đã đăng xuất an toàn.');
      showToast('Đã đăng xuất!');
    });

    // Login / First-Admin Registration Form
    $('authLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = ($('authEmailInput')?.value || '').trim();
      const password = $('authPasswordInput')?.value || '';
      const fullName = ($('authFullNameInput')?.value || '').trim();
      const submitBtn = $('btnAuthSubmit');
      const labelEl = $('authSubmitLabel');
      const origLabel = labelEl?.textContent || 'Đăng nhập';

      if (!email || !password) {
        setAuthGateMsg('err', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
        return;
      }

      submitBtn.disabled = true;
      if (labelEl) labelEl.textContent = authState.firstAdminRegMode ? 'Đang tạo Admin...' : 'Đang đăng nhập...';
      setAuthGateMsg('', '');

      try {
        let session = null;
        if (authState.firstAdminRegMode) {
          const signUpRes = await SB.signUpStateless(draft, {
            email,
            password,
            fullName: fullName || 'Admin Quản Trị',
            role: 'admin'
          });
          if (signUpRes && signUpRes.access_token) {
            SB.saveSession(signUpRes);
            session = SB.getStoredSession();
          } else {
            // Try direct password sign-in immediately
            session = await SB.signIn(draft, email, password);
          }
        } else {
          session = await SB.signIn(draft, email, password);
        }

        await activateAuthenticatedSession(session);
        $('authPasswordInput').value = '';
        showToast(`Xin chào ${authState.profile?.full_name || authState.profile?.email}!`);
      } catch (err) {
        setAuthGateMsg('err', `⚠️ ${escHtml(err.message)}`);
      } finally {
        submitBtn.disabled = false;
        if (labelEl) labelEl.textContent = origLabel;
      }
    });

    // Copy Supabase SQL schema (1-click, Admin only)
    $('btnCopySupabaseSql')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
      const btn = $('btnCopySupabaseSql');
      btn.disabled = true;
      try {
        const res = await fetch(`${BASE}/scripts/supabase-schema.sql?v=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const sql = await res.text();
        await copyText(sql);
        setSupabaseConnectMsg('ok', '✅ Đã copy toàn bộ mã <strong>SQL khởi tạo Supabase</strong>! Hãy mở Supabase → <strong>SQL Editor → New query</strong> → dán vào và bấm <strong>Run</strong>.');
        showToast('Đã copy mã SQL Supabase!');
      } catch (err) {
        setSupabaseConnectMsg('err', `⚠️ Không tải được mã SQL (${escHtml(err.message)}). Bạn có thể lấy từ file <code>scripts/supabase-schema.sql</code> trong GitHub.`);
      } finally {
        btn.disabled = false;
      }
    });

    // Connect Supabase URL + Anon Key (Admin only)
    $('btnConnectSupabase')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
      const url = SB.cleanUrl($('cfgSupabaseUrl')?.value || '');
      const key = ($('cfgSupabaseAnonKey')?.value || '').trim();
      const btn = $('btnConnectSupabase');

      if (!url || !key) {
        setSupabaseConnectMsg('err', '⚠️ Vui lòng nhập đầy đủ cả <strong>Supabase Project URL</strong> và <strong>Publishable / Anon Key</strong>.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Đang kiểm tra...';
      setSupabaseConnectMsg('warn', 'Đang kiểm tra kết nối tới Supabase & bảng user_profiles...');

      try {
        await SB.testConnection(url, key);
        draft.supabaseUrl = url;
        draft.supabaseAnonKey = key;
        dirty.supabase = true;
        draft.updatedAt = Date.now();
        await WS.saveLocalConfig(draft);

        const tok = getEffectiveToken();
        if (tok) {
          btn.textContent = 'Đang đồng bộ Web...';
          const { config: published } = await WS.publishConfigToGitHub(draft, {
            token: tok,
            dirty: { groom: false, bride: false, sheet: false, supabase: true, photoKeys: [], albumIndices: [] }
          });
          draft = published;
          dirty.supabase = false;
        }

        syncSupabaseConnectionUI();
        showToast('Kết nối Supabase thành công! Hãy tạo/đăng nhập tài khoản Admin.');

        // Transition immediately to Auth Gate so Admin signs in / creates first Admin account
        const existingSess = await SB.ensureValidSession(draft);
        if (existingSess) {
          try {
            await activateAuthenticatedSession(existingSess);
            setSupabaseConnectMsg('ok', '✅ Đã kết nối Supabase &amp; đăng nhập Admin thành công!');
            return;
          } catch (_) {}
        }

        authState.mode = 'login_required';
        authState.session = null;
        authState.profile = null;
        collapseAllMajorPanels();
        applyRolePermissions();
        await refreshLoginGateMode();
        setAuthGateMsg('ok', '✅ Kết nối Supabase thành công! Hãy đăng nhập (hoặc tạo tài khoản Admin đầu tiên ngay bên trên).');
      } catch (err) {
        setSupabaseConnectMsg('err', `⚠️ Chưa kết nối được Supabase: <strong>${escHtml(err.message)}</strong>`);
        showToast('Lỗi kết nối Supabase!');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kết nối Supabase';
      }
    });

    // Disconnect Supabase (Admin only)
    $('btnDisconnectSupabase')?.addEventListener('click', async () => {
      if (authState.role !== 'admin') return;
      const ok = window.confirm('Tắt yêu cầu đăng nhập Supabase trên trang quản lý? (Dữ liệu user trong Supabase vẫn được giữ nguyên)');
      if (!ok) return;
      await SB.signOut(draft, authState.session);
      draft.supabaseUrl = '';
      draft.supabaseAnonKey = '';
      dirty.supabase = true;
      draft.updatedAt = Date.now();
      await WS.saveLocalConfig(draft);

      const tok = getEffectiveToken();
      if (tok) {
        try {
          const { config: published } = await WS.publishConfigToGitHub(draft, {
            token: tok,
            dirty: { groom: false, bride: false, sheet: false, supabase: true, photoKeys: [], albumIndices: [] }
          });
          draft = published;
          dirty.supabase = false;
        } catch (_) {}
      }

      authState.mode = 'open_admin';
      authState.role = 'admin';
      authState.session = null;
      authState.profile = null;
      syncSupabaseConnectionUI();
      applyRolePermissions();
      setSupabaseConnectMsg('warn', 'Đã tắt chế độ đăng nhập Supabase.');
      showToast('Đã tắt đăng nhập Supabase!');
    });

    // Create new User (Admin only)
    $('createUserForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authState.role !== 'admin' || !authState.session) return;

      const fullName = ($('newUserName')?.value || '').trim();
      const email = ($('newUserEmail')?.value || '').trim().toLowerCase();
      const password = $('newUserPassword')?.value || '';
      const role = $('newUserRole')?.value || 'groom';
      const btn = $('btnCreateUser');

      btn.disabled = true;
      setUserMgmtMsg('warn', 'Đang tạo tài khoản &amp; gán quyền trên Supabase...');

      try {
        const res = await SB.signUpStateless(draft, { email, password, fullName, role });
        const newUid = res?.user?.id || res?.id;
        if (!newUid) {
          throw new Error('Supabase không trả về mã người dùng. Hãy kiểm tra cài đặt Email Signup.');
        }

        // Wait a brief moment for handle_new_user trigger to insert user_profiles row, then activate & assign exact role
        await new Promise((r) => setTimeout(r, 350));
        await SB.updateUserProfile(draft, authState.session, newUid, {
          full_name: fullName,
          role,
          is_active: true
        });

        $('createUserForm').reset();
        const roleLabel = role === 'admin' ? 'Admin' : (role === 'bride' ? 'Cô dâu' : 'Chú rể');
        setUserMgmtMsg('ok', `✅ Đã tạo tài khoản <strong>${escHtml(fullName)}</strong> (<code>${escHtml(email)}</code> · Vai trò: <strong>${roleLabel}</strong>) và kích hoạt ngay! Bạn có thể gửi Email + Mật khẩu này cho người dùng đăng nhập tại trang <code>/quan-ly/</code>.`);
        showToast(`Đã tạo tài khoản ${roleLabel}!`);
        await loadUsersList();
      } catch (err) {
        setUserMgmtMsg('err', `⚠️ Không tạo được tài khoản: <strong>${escHtml(err.message)}</strong>`);
      } finally {
        btn.disabled = false;
      }
    });

    // Refresh users list
    $('btnRefreshUsers')?.addEventListener('click', () => {
      loadUsersList();
      showToast('Đã làm mới danh sách tài khoản!');
    });

    // Inline Role change / Lock toggle / Delete on users list
    $('usersListContainer')?.addEventListener('change', async (e) => {
      const sel = e.target.closest('[data-user-role-sel]');
      if (!sel || authState.role !== 'admin' || !authState.session) return;
      const uid = sel.dataset.userRoleSel;
      const newRole = sel.value;
      sel.disabled = true;
      try {
        await SB.updateUserProfile(draft, authState.session, uid, { role: newRole });
        showToast('Đã cập nhật vai trò người dùng!');
        await loadUsersList();
      } catch (err) {
        showToast(`Lỗi đổi quyền: ${err.message}`);
      } finally {
        sel.disabled = false;
      }
    });

    $('usersListContainer')?.addEventListener('click', async (e) => {
      if (authState.role !== 'admin' || !authState.session) return;

      const toggleBtn = e.target.closest('[data-user-toggle-active]');
      if (toggleBtn) {
        const uid = toggleBtn.dataset.userToggleActive;
        const nextActive = toggleBtn.dataset.curActive !== '1';
        toggleBtn.disabled = true;
        try {
          await SB.updateUserProfile(draft, authState.session, uid, { is_active: nextActive });
          showToast(nextActive ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!');
          await loadUsersList();
        } catch (err) {
          showToast(`Lỗi cập nhật trạng thái: ${err.message}`);
        } finally {
          toggleBtn.disabled = false;
        }
        return;
      }

      const delBtn = e.target.closest('[data-user-delete]');
      if (delBtn) {
        const uid = delBtn.dataset.userDelete;
        const email = delBtn.dataset.userEmail || '';
        if (!window.confirm(`Xóa quyền truy cập của tài khoản ${email}?`)) return;
        delBtn.disabled = true;
        try {
          await SB.deleteUserProfile(draft, authState.session, uid);
          showToast('Đã thu hồi tài khoản khỏi trang quản lý!');
          await loadUsersList();
        } catch (err) {
          showToast(`Lỗi xóa tài khoản: ${err.message}`);
        } finally {
          delBtn.disabled = false;
        }
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
    initSupabaseAndAuth();

    // Ensure all major sections start collapsed by default
    collapseAllMajorPanels();

    const savedTok = getSavedToken();
    if (setupInfo.autoConnected) {
      $('githubSyncDetails')?.removeAttribute('open');
      const banner = $('autoConnectBanner');
      if (banner) {
        banner.innerHTML = '🎉 <strong>Đã tự động kết nối đồng bộ lên Web!</strong> Hãy bấm vào mục <strong>Phần 3 · Cấu Hình Thông Tin Thiệp Cưới</strong> để chỉnh sửa rồi bấm <strong>Lưu &amp; Cập nhật lên Web</strong> bên dưới.';
        banner.classList.remove('hidden');
      }
      showToast('Đã kết nối sẵn quyền đồng bộ!');
    }

    // Load 2-level Vietnam units + freshest wedding config
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

    // Check if Supabase RBAC is enabled
    if (SB && SB.isConfigured(draft)) {
      const session = await SB.ensureValidSession(draft);
      if (session) {
        try {
          await activateAuthenticatedSession(session, setupInfo.tab);
        } catch (err) {
          authState.mode = 'login_required';
          authState.role = 'groom';
          applyRolePermissions();
          await refreshLoginGateMode();
          setAuthGateMsg('warn', `⚠️ ${escHtml(err.message)}`);
        }
      } else {
        authState.mode = 'login_required';
        authState.role = 'groom';
        applyRolePermissions();
        await refreshLoginGateMode();
      }
    } else {
      // Pre-Supabase open admin setup mode
      authState.mode = 'open_admin';
      authState.role = 'admin';
      applyRolePermissions(setupInfo.tab || 'groom');
    }

    window.addEventListener('hashchange', () => {
      const next = consumeSetupHash();
      if (next.autoConnected) {
        if ($('ghTokenInput')) $('ghTokenInput').value = getSavedToken();
        updateSyncBadge();
        $('githubSyncDetails')?.removeAttribute('open');
        const banner = $('autoConnectBanner');
        if (banner) {
          banner.innerHTML = '🎉 <strong>Đã tự động kết nối đồng bộ lên Web!</strong> Hãy bấm vào mục cần sửa rồi bấm <strong>Lưu &amp; Cập nhật lên Web</strong> bên dưới.';
          banner.classList.remove('hidden');
        }
        showToast('Đã kết nối sẵn quyền đồng bộ!');
      }
      if (next.tab && authState.role === 'admin') loadSideToForm(next.tab);
    });
  }

  init();
})();
