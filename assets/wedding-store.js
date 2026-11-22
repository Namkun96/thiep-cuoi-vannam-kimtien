/* ==========================================================================
   WEDDING STORE — SHARED CONFIG, INDEXEDDB, LUNAR CALENDAR & GITHUB PUBLISH
   Shared across: /, /nha-trai/, /nha-gai/, and /quan-ly/
   ========================================================================== */

(() => {
  'use strict';

  const DB_NAME = 'ThiepCuoiVanNamKimTienDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'kv';
  const CONFIG_KEY = 'activeConfig';
  const LS_FALLBACK_KEY = 'thiep_cuoi_active_config_v1';

  const DEFAULT_CONFIG = {
    version: 1,
    updatedAt: 0,
    groomName: 'Nguyễn Văn Nam',
    brideName: 'Nguyễn Thị Kim Tiến',
    sheetViewUrl: 'https://docs.google.com/spreadsheets/d/1TAM_jS1z_ugR0zEztDiA2hwzTsZK034Fkw1nUW6jzvY/edit',
    sheetApiUrl: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    groom: {
      parent: 'Bà: Nguyễn Thị ...',
      province: 'Thành phố Hà Nội',
      ward: 'Xã Thanh Oai',
      detailAddress: 'Thị trấn Kim Bài',
      venueNote: 'Có chỗ đỗ xe thuận tiện ngay gần rạp tiệc',
      partyDate: '2027-01-02',
      partyTime: '16:30',
      ceremonyDate: '2027-01-03',
      ceremonyTime: '08:00',
      bankName: 'Vietcombank — CN Hà Nội',
      bankAcc: '0011 0045 67890',
      bankOwner: 'NGUYEN VAN NAM',
      qrImage: ''
    },
    bride: {
      parent: 'Bà: Trần Thị ...',
      province: 'Thành phố Hà Nội',
      ward: 'Xã Đông Anh',
      detailAddress: 'Thôn Cầu Cả, Cổ Loa',
      venueNote: 'Bãi đỗ ô tô đầu đường cách tư gia khoảng 10 phút đi bộ nhẹ',
      partyDate: '2027-01-02',
      partyTime: '16:30',
      ceremonyDate: '2027-01-03',
      ceremonyTime: '09:30',
      bankName: 'Techcombank — CN Đông Anh',
      bankAcc: '1903 8899 12345',
      bankOwner: 'NGUYEN THI KIM TIEN',
      qrImage: ''
    },
    photos: {
      hero: 'images/hero-arch.webp',
      interlude: 'images/banner-rings.webp',
      storyBg: 'images/hands-rings.webp',
      polaroidGroom: 'images/arch-closeup.webp',
      polaroidBride: 'images/aodai-closeup.webp',
      vinylLabel: 'images/arch-closeup.webp',
      rsvpThanks: 'images/aodai-closeup.webp',
      footerBg: 'images/banner-rings.webp',
      album: [
        'images/banner-rings.webp',
        'images/aodai-full.webp',
        'images/arch-closeup.webp',
        'images/hands-rings.webp',
        'images/hero-arch.webp',
        'images/aodai-closeup.webp',
        'images/bouquet.webp'
      ]
    }
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeConfig(incoming) {
    const base = clone(DEFAULT_CONFIG);
    if (!incoming || typeof incoming !== 'object') return base;
    if (typeof incoming.updatedAt === 'number') base.updatedAt = incoming.updatedAt;
    if (incoming.groomName) base.groomName = String(incoming.groomName);
    if (incoming.brideName) base.brideName = String(incoming.brideName);
    if (typeof incoming.sheetViewUrl === 'string' && incoming.sheetViewUrl.trim()) {
      base.sheetViewUrl = incoming.sheetViewUrl.trim();
    }
    if (typeof incoming.sheetApiUrl === 'string') {
      base.sheetApiUrl = incoming.sheetApiUrl.trim();
    }
    if (typeof incoming.supabaseUrl === 'string') {
      base.supabaseUrl = incoming.supabaseUrl.trim().replace(/\/+$/, '');
    }
    if (typeof incoming.supabaseAnonKey === 'string') {
      base.supabaseAnonKey = incoming.supabaseAnonKey.trim();
    }
    if (incoming.groom && typeof incoming.groom === 'object') {
      Object.assign(base.groom, incoming.groom);
    }
    if (incoming.bride && typeof incoming.bride === 'object') {
      Object.assign(base.bride, incoming.bride);
    }
    if (incoming.photos && typeof incoming.photos === 'object') {
      const incomingAlbum = Array.isArray(incoming.photos.album) ? incoming.photos.album : null;
      Object.assign(base.photos, incoming.photos);
      base.photos.album = clone(DEFAULT_CONFIG.photos.album);
      if (incomingAlbum) {
        for (let i = 0; i < base.photos.album.length; i++) {
          if (incomingAlbum[i]) base.photos.album[i] = incomingAlbum[i];
        }
      }
    }
    return base;
  }

  /* ===== INDEXEDDB PERSISTENCE (SUPPORTS LARGE COMPRESSED IMAGES) ===== */
  function openDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('No IndexedDB'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open error'));
    });
  }

  async function loadLocalConfig() {
    try {
      const db = await openDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(CONFIG_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      try {
        const raw = localStorage.getItem(LS_FALLBACK_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (__) {
        return null;
      }
    }
  }

  async function saveLocalConfig(cfg) {
    const normalized = mergeConfig(cfg);
    if (!normalized.updatedAt) normalized.updatedAt = Date.now();
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(normalized, CONFIG_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {
      try {
        localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(normalized));
      } catch (__) {}
    }
    return normalized;
  }

  async function clearLocalConfig() {
    try {
      const db = await openDb();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(CONFIG_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (_) {}
    try { localStorage.removeItem(LS_FALLBACK_KEY); } catch (_) {}
  }

  async function loadRemoteConfig(base = '.') {
    try {
      const url = `${base}/data/config.json?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  async function loadConfig(base = '.') {
    const [remote, local] = await Promise.all([
      loadRemoteConfig(base),
      loadLocalConfig()
    ]);

    const remoteTs = remote && typeof remote.updatedAt === 'number' ? remote.updatedAt : 0;
    const localTs = local && typeof local.updatedAt === 'number' ? local.updatedAt : 0;

    if (local && localTs >= remoteTs && localTs > 0) {
      return { config: mergeConfig(local), source: 'local', hasLocalOverride: localTs > remoteTs };
    }
    if (remote) {
      return { config: mergeConfig(remote), source: 'remote', hasLocalOverride: false };
    }
    return { config: clone(DEFAULT_CONFIG), source: 'default', hasLocalOverride: false };
  }

  /* ===== VIETNAMESE LUNAR CALENDAR (HO NGOC DUC ASTRONOMICAL ALGORITHM, UTC+7) ===== */
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const WEEKDAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const MONTHS_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function jdFromDate(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) {
      jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    }
    return jd;
  }

  function getNewMoonDay(k, timeZone) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    let deltat;
    if (T < -11) {
      deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
      deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return Math.floor(Jd1 + C1 - deltat + 0.5 + timeZone / 24);
  }

  function getSunLongitude(jdn, timeZone) {
    const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= Math.PI * 2 * Math.floor(L / (Math.PI * 2));
    return Math.floor((L / Math.PI) * 6);
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = Math.floor(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    if (getSunLongitude(nm, timeZone) >= 9) {
      nm = getNewMoonDay(k - 1, timeZone);
    }
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  function solarToLunar(dateStr) {
    const p = parseDateParts(dateStr);
    const timeZone = 7;
    const dayNumber = jdFromDate(p.day, p.month, p.year);
    const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);
    let a11 = getLunarMonth11(p.year, timeZone);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
      lunarYear = p.year;
      a11 = getLunarMonth11(p.year - 1, timeZone);
    } else {
      lunarYear = p.year + 1;
      b11 = getLunarMonth11(p.year + 1, timeZone);
    }
    const lunarDay = dayNumber - monthStart + 1;
    const diff = Math.floor((monthStart - a11) / 29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) lunarLeap = 1;
      }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

    const canChi = `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;
    const dd = String(lunarDay).padStart(2, '0');
    const mm = String(lunarMonth).padStart(2, '0');
    const leapStr = lunarLeap ? ' nhuận' : '';
    return {
      day: lunarDay,
      month: lunarMonth,
      year: lunarYear,
      leap: Boolean(lunarLeap),
      canChi,
      dd,
      mm,
      text: `ngày ${dd} tháng ${mm}${leapStr} năm ${canChi}`
    };
  }

  function parseDateParts(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
    const year = m ? parseInt(m[1], 10) : 2027;
    const month = m ? parseInt(m[2], 10) : 1;
    const day = m ? parseInt(m[3], 10) : 2;
    const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const wd = WEEKDAYS_VI[dt.getUTCDay()];
    return {
      year,
      month,
      day,
      dd: String(day).padStart(2, '0'),
      mm: String(month).padStart(2, '0'),
      weekdayVi: wd,
      weekdayUpper: wd.toUpperCase(),
      monthEn: MONTHS_EN[month - 1] || 'January',
      monthVi: `THÁNG ${String(month).padStart(2, '0')}`
    };
  }

  /* ===== ADDRESS & MAP HELPERS ===== */
  function shortProvince(prov) {
    return String(prov || '')
      .replace(/^Thành phố\s+/i, 'TP. ')
      .replace(/^Tỉnh\s+/i, 'Tỉnh ')
      .trim();
  }

  function formatFullAddress(side) {
    return [side?.detailAddress, side?.ward, side?.province]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  function formatShortAddressHtml(side) {
    const line1 = [side?.detailAddress, side?.ward]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join(', ');
    const line2 = shortProvince(side?.province);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (line1 && line2) return `${esc(line1)}<br/>${esc(line2)}`;
    return esc(line1 || line2 || '');
  }

  function buildMapUrl(fullAddr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`;
  }

  function buildMapEmbedUrl(fullAddr) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddr)}&t=m&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  function resolveAsset(src, base = '.') {
    if (!src) return '';
    if (/^(data:|https?:|blob:|\/)/i.test(src)) return src;
    return `${base}/${src.replace(/^\.?\//, '')}`;
  }

  /* ===== SMART IMAGE COMPRESSION FOR PHONE UPLOADS ===== */
  function compressImageFile(file, opts = {}) {
    const maxEdge = opts.maxEdge || 1200;
    const quality = opts.quality || 0.84;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Định dạng ảnh không hỗ trợ'));
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxEdge || h > maxEdge) {
            if (w >= h) {
              h = Math.round((h * maxEdge) / w);
              w = maxEdge;
            } else {
              w = Math.round((w * maxEdge) / h);
              h = maxEdge;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ===== OPTIONAL SINGLE-COMMIT PUBLISH TO GITHUB PAGES ===== */
  function dataUrlToBase64(dataUrl) {
    const m = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const rawExt = m[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    return { ext, base64: m[2] };
  }

  async function ghRequest(path, token, opts = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...(opts.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const rawMsg = data.message || `GitHub API lỗi HTTP ${res.status}`;
      if (res.status === 403 && /Resource not accessible/i.test(rawMsg)) {
        throw new Error(
          'Token chưa đủ quyền GHI vào repo thiep-cuoi-vannam-kimtien (Resource not accessible). Hãy tạo lại Token bằng link "Tạo nhanh Token (đã tích sẵn quyền)" bên trên hoặc cấp quyền Contents: Read and write.'
        );
      }
      if (res.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn (401). Vui lòng tạo Token mới và bấm Kết nối lại.');
      }
      throw new Error(rawMsg);
    }
    return data;
  }

  function decodeBase64Utf8(b64) {
    const binStr = atob(String(b64 || '').replace(/\s+/g, ''));
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  async function verifyGitHubToken(token, opts = {}) {
    const cleanTok = String(token || '').trim();
    const owner = opts.owner || 'Namkun96';
    const repo = opts.repo || 'thiep-cuoi-vannam-kimtien';
    if (!cleanTok) throw new Error('Vui lòng dán GitHub Token');

    // Step 1: Verify repo access
    try {
      await ghRequest(`/repos/${owner}/${repo}`, cleanTok);
    } catch (err) {
      if (/Bad credentials|401/i.test(err.message)) {
        throw new Error('Token không đúng hoặc đã hết hạn. Vui lòng tạo Token mới.');
      }
      throw err;
    }

    // Step 2: Verify real WRITE permission (Contents: Read and write / repo scope)
    // Creates a tiny unreferenced blob without touching any branch or triggering deploy
    try {
      await ghRequest(`/repos/${owner}/${repo}/git/blobs`, cleanTok, {
        method: 'POST',
        body: JSON.stringify({ content: 'ok', encoding: 'utf-8' })
      });
    } catch (err) {
      if (/Resource not accessible|403|Not Found|404/i.test(err.message)) {
        throw new Error(
          'Token chưa có quyền GHI vào kho thiệp cưới (thiếu quyền Contents: Read and write hoặc chưa chọn đúng kho thiep-cuoi-vannam-kimtien). Hãy bấm link "Tạo nhanh Token (đã tích sẵn quyền)" bên trên rồi bấm Generate token và dán lại!'
        );
      }
      throw err;
    }

    return true;
  }

  async function fetchLatestGitHubConfig(token, opts = {}) {
    const cleanTok = String(token || '').trim();
    const owner = opts.owner || 'Namkun96';
    const repo = opts.repo || 'thiep-cuoi-vannam-kimtien';
    const branch = opts.branch || 'main';
    if (!cleanTok) return null;
    try {
      const file = await ghRequest(`/repos/${owner}/${repo}/contents/data/config.json?ref=${encodeURIComponent(branch)}`, cleanTok);
      if (file && file.content) {
        return mergeConfig(JSON.parse(decodeBase64Utf8(file.content)));
      }
    } catch (_) {}
    return null;
  }

  async function publishConfigToGitHub(config, opts = {}) {
    const token = String(opts.token || '').trim();
    const owner = opts.owner || 'Namkun96';
    const repo = opts.repo || 'thiep-cuoi-vannam-kimtien';
    const branch = opts.branch || 'main';
    const dirty = opts.dirty || null;
    const forceFullReplace = Boolean(opts.forceFullReplace);
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};

    if (!token) throw new Error('Chưa nhập GitHub Token');

    const localCandidate = mergeConfig(config);
    let published = localCandidate;

    // Smart merge onto freshest GitHub config so Groom & Bride never overwrite each other
    if (dirty && !forceFullReplace) {
      onProgress('Đang đồng bộ dữ liệu mới nhất từ GitHub...');
      const latestRemote = await fetchLatestGitHubConfig(token, { owner, repo, branch });
      if (latestRemote) {
        published = mergeConfig(latestRemote);
        if (dirty.groom) published.groom = clone(localCandidate.groom);
        if (dirty.bride) published.bride = clone(localCandidate.bride);
        if (dirty.sheet) {
          published.sheetApiUrl = localCandidate.sheetApiUrl;
          published.sheetViewUrl = localCandidate.sheetViewUrl;
        }
        if (dirty.supabase) {
          published.supabaseUrl = localCandidate.supabaseUrl;
          published.supabaseAnonKey = localCandidate.supabaseAnonKey;
        }
        if (dirty.photoKeys && dirty.photoKeys.length) {
          dirty.photoKeys.forEach((k) => {
            if (k in published.photos) published.photos[k] = localCandidate.photos[k];
          });
        }
        if (dirty.albumIndices && dirty.albumIndices.length) {
          dirty.albumIndices.forEach((idx) => {
            if (idx >= 0 && idx < published.photos.album.length) {
              published.photos.album[idx] = localCandidate.photos.album[idx];
            }
          });
        }
      }
    }

    published.updatedAt = Date.now();
    const versionTag = published.updatedAt;
    const treeEntries = [];

    const uploadImageSlot = async (slotName, dataUrl) => {
      const parsed = dataUrlToBase64(dataUrl);
      if (!parsed) return dataUrl;
      onProgress(`Đang tải ảnh ${slotName}...`);
      const blob = await ghRequest(`/repos/${owner}/${repo}/git/blobs`, token, {
        method: 'POST',
        body: JSON.stringify({ content: parsed.base64, encoding: 'base64' })
      });
      const repoPath = `images/custom/${slotName}.${parsed.ext}`;
      treeEntries.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
      return `${repoPath}?v=${versionTag}`;
    };

    if (published.groom.qrImage && published.groom.qrImage.startsWith('data:')) {
      published.groom.qrImage = await uploadImageSlot('qr-groom', published.groom.qrImage);
    }
    if (published.bride.qrImage && published.bride.qrImage.startsWith('data:')) {
      published.bride.qrImage = await uploadImageSlot('qr-bride', published.bride.qrImage);
    }

    for (const key of ['hero', 'interlude', 'storyBg', 'polaroidGroom', 'polaroidBride', 'vinylLabel', 'rsvpThanks', 'footerBg']) {
      if (published.photos[key] && published.photos[key].startsWith('data:')) {
        published.photos[key] = await uploadImageSlot(`photo-${key}`, published.photos[key]);
      }
    }

    for (let i = 0; i < published.photos.album.length; i++) {
      const item = published.photos.album[i];
      if (item && item.startsWith('data:')) {
        published.photos.album[i] = await uploadImageSlot(`album-${i + 1}`, item);
      }
    }

    onProgress('Đang lưu data/config.json lên GitHub...');
    const configJsonStr = JSON.stringify(published, null, 2) + '\n';
    const configBlob = await ghRequest(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content: configJsonStr, encoding: 'utf-8' })
    });
    treeEntries.push({ path: 'data/config.json', mode: '100644', type: 'blob', sha: configBlob.sha });

    onProgress('Đang cập nhật nhánh main (GitHub Pages)...');
    const refData = await ghRequest(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    const parentSha = refData.object.sha;
    const parentCommit = await ghRequest(`/repos/${owner}/${repo}/git/commits/${parentSha}`, token);

    const newTree = await ghRequest(`/repos/${owner}/${repo}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: treeEntries })
    });

    const newCommit = await ghRequest(`/repos/${owner}/${repo}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message: `Cập nhật cấu hình thiệp cưới (${new Date(versionTag).toLocaleString('vi-VN')})`,
        tree: newTree.sha,
        parents: [parentSha]
      })
    });

    await ghRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha, force: false })
    });

    await saveLocalConfig(published);
    return { config: published, commitSha: newCommit.sha };
  }

  /* =========================================================================
     GOOGLE SHEET WEB APP DATABASE CLIENT + LOCAL MIRROR FALLBACK
     ========================================================================= */
  const LOCAL_GUESTS_KEY = 'thiep_cuoi_guest_db_local_v1';

  function normVi(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  function nowVnStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function normalizeSideLabel(raw, mode) {
    const s = normVi(raw);
    if (s.includes('trai') || s === 'groom' || s === 'nha-trai') return 'Nhà Trai';
    if (s.includes('gai') || s === 'bride' || s === 'nha-gai') return 'Nhà Gái';
    if (s.includes('chung') || s === 'both') return 'Bản chung';
    if (mode === 'nha-trai') return 'Nhà Trai';
    if (mode === 'nha-gai') return 'Nhà Gái';
    return 'Bản chung';
  }

  function parseHeadcount(str) {
    const s = String(str || '');
    if (s.includes('3') || s.includes('4')) return 4;
    const m = /(\d+)/.exec(s);
    return m ? Math.max(1, parseInt(m[1], 10)) : 1;
  }

  function readLocalGuests() {
    try {
      const raw = localStorage.getItem(LOCAL_GUESTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocalGuests(arr) {
    try {
      localStorage.setItem(LOCAL_GUESTS_KEY, JSON.stringify(arr.slice(0, 500)));
    } catch (_) {}
  }

  function upsertLocalGuest(payload) {
    const list = readLocalGuests();
    const action = String(payload.action || '');
    const ts = nowVnStr();
    const side = normalizeSideLabel(payload.side, payload.sourceMode);
    const isNamed = action === 'register_guest' ? true : Boolean(payload.isNamed);
    const type = isNamed ? 'Link riêng' : 'Vãng lai';
    const id = String(payload.id || '').trim();
    const name = String(payload.name || '').trim();
    const nName = normVi(name);

    let idx = -1;
    if (id) idx = list.findIndex((x) => x.id === id);
    if (idx === -1 && nName && type === 'Link riêng') {
      idx = list.findIndex((x) => x.type === 'Link riêng' && normVi(x.name) === nName && x.side === side);
    }

    if (idx !== -1) {
      const cur = list[idx];
      if (action === 'register_guest') {
        cur.link = payload.link || cur.link;
        cur.sourceMode = payload.sourceMode || cur.sourceMode;
        cur.updatedAt = ts;
      } else if (action === 'track_open') {
        cur.viewed = 'Đã xem';
        cur.openCount = (Number(cur.openCount) || 0) + 1;
        cur.lastOpen = ts;
        cur.updatedAt = ts;
        if (payload.link && !cur.link) cur.link = payload.link;
        if (payload.sourceMode) cur.sourceMode = payload.sourceMode;
      } else if (action === 'submit_rsvp') {
        if (cur.type === 'Vãng lai' || !cur.name || cur.name.startsWith('Khách vãng lai')) {
          cur.name = name || cur.name;
        }
        if (side !== 'Bản chung' || cur.side === 'Bản chung') cur.side = side;
        cur.viewed = 'Đã xem';
        cur.openCount = Math.max(1, Number(cur.openCount) || 0);
        if (!cur.lastOpen) cur.lastOpen = ts;
        cur.rsvpStatus = payload.status || 'Sẽ tham dự';
        cur.guestCount = payload.count || '1 người';
        cur.wish = payload.wish || '';
        cur.updatedAt = ts;
      }
      list.splice(idx, 1);
      list.unshift(cur);
      writeLocalGuests(list);
      return cur;
    }

    const row = {
      id: id || `${isNamed ? 'K' : 'V'}-${Date.now()}`,
      type,
      side,
      name: name || 'Khách vãng lai (chưa nhập tên)',
      link: String(payload.link || ''),
      viewed: action === 'register_guest' ? 'Chưa xem' : 'Đã xem',
      openCount: action === 'register_guest' ? 0 : 1,
      lastOpen: action === 'register_guest' ? '' : ts,
      rsvpStatus: action === 'submit_rsvp' ? (payload.status || 'Sẽ tham dự') : 'Chưa phản hồi',
      guestCount: action === 'submit_rsvp' ? (payload.count || '1 người') : '',
      wish: action === 'submit_rsvp' ? String(payload.wish || '') : '',
      sourceMode: String(payload.sourceMode || 'both'),
      updatedAt: ts
    };
    list.unshift(row);
    writeLocalGuests(list);
    return row;
  }

  function isRowAllowedForScope(item, scope) {
    if (scope === 'groom') return item.side === 'Nhà Trai' || item.side === 'Bản chung';
    if (scope === 'bride') return item.side === 'Nhà Gái' || item.side === 'Bản chung';
    return true;
  }

  function computeGuestStats(rows) {
    const stats = {
      total: rows.length,
      groom: 0,
      bride: 0,
      both: 0,
      named: 0,
      walkin: 0,
      viewed: 0,
      unviewed: 0,
      attending: 0,
      declined: 0,
      pending: 0,
      estPeople: 0
    };
    rows.forEach((r) => {
      if (r.side === 'Nhà Trai') stats.groom++;
      else if (r.side === 'Nhà Gái') stats.bride++;
      else stats.both++;

      if (r.type === 'Link riêng') stats.named++;
      else stats.walkin++;

      if (r.viewed === 'Đã xem') stats.viewed++;
      else stats.unviewed++;

      if (r.rsvpStatus === 'Sẽ tham dự') {
        stats.attending++;
        stats.estPeople += parseHeadcount(r.guestCount);
      } else if (r.rsvpStatus === 'Rất tiếc bận') {
        stats.declined++;
      } else {
        stats.pending++;
      }
    });
    return stats;
  }

  function queryLocalGuests(filters = {}) {
    const scope = String(filters.scope || 'all');
    const allRows = readLocalGuests().filter((item) => isRowAllowedForScope(item, scope));
    const stats = computeGuestStats(allRows);

    const sideFilter = String(filters.side || 'all');
    const typeFilter = String(filters.type || 'all');
    const rsvpFilter = String(filters.rsvp || 'all');
    const viewedFilter = String(filters.viewed || 'all');
    const q = normVi(filters.q || '');

    const filtered = allRows.filter((item) => {
      if (sideFilter === 'groom' && item.side !== 'Nhà Trai') return false;
      if (sideFilter === 'bride' && item.side !== 'Nhà Gái') return false;
      if (sideFilter === 'both' && item.side !== 'Bản chung') return false;
      if (sideFilter === 'groom_both' && item.side !== 'Nhà Trai' && item.side !== 'Bản chung') return false;
      if (sideFilter === 'bride_both' && item.side !== 'Nhà Gái' && item.side !== 'Bản chung') return false;
      if (typeFilter === 'named' && item.type !== 'Link riêng') return false;
      if (typeFilter === 'walkin' && item.type !== 'Vãng lai') return false;
      if (viewedFilter === 'yes' && item.viewed !== 'Đã xem') return false;
      if (viewedFilter === 'no' && item.viewed !== 'Chưa xem') return false;
      if (rsvpFilter === 'attending' && item.rsvpStatus !== 'Sẽ tham dự') return false;
      if (rsvpFilter === 'declined' && item.rsvpStatus !== 'Rất tiếc bận') return false;
      if (rsvpFilter === 'pending' && item.rsvpStatus !== 'Chưa phản hồi') return false;
      if (q) {
        const hay = normVi(`${item.name} ${item.wish} ${item.side} ${item.id}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const pageSize = Math.max(1, Math.min(50, parseInt(filters.pageSize, 10) || 10));
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const page = Math.max(1, Math.min(totalPages, parseInt(filters.page, 10) || 1));
    const start = (page - 1) * pageSize;

    return {
      ok: true,
      source: 'local',
      scopeApplied: true,
      stats,
      page,
      pageSize,
      totalFiltered,
      totalPages,
      items: filtered.slice(start, start + pageSize)
    };
  }

  async function sheetGet(apiUrl, paramsObj = {}) {
    const clean = String(apiUrl || '').trim();
    if (!clean) throw new Error('Chưa cấu hình link Google Apps Script');
    const qs = new URLSearchParams(paramsObj);
    const sep = clean.includes('?') ? '&' : '?';
    const res = await fetch(`${clean}${sep}${qs.toString()}`, { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Google Sheet API lỗi HTTP ${res.status}`);
    }
    return data;
  }

  async function sheetPost(apiUrl, payload) {
    // Always mirror locally for instant preview & resilience
    upsertLocalGuest(payload);
    const clean = String(apiUrl || '').trim();
    if (!clean) return { ok: true, localOnly: true };
    try {
      // text/plain avoids CORS preflight OPTIONS so Google Apps Script handles POST cleanly
      const res = await fetch(clean, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ ok: true }));
      return data;
    } catch (_) {
      // Fallback fire-and-forget no-cors POST if browser restricts cross-origin response
      try {
        await fetch(clean, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (__) {}
      return { ok: true, opaque: true };
    }
  }

  async function pingSheet(apiUrl) {
    return sheetGet(apiUrl, { action: 'ping', t: String(Date.now()) });
  }

  async function listSheetGuests(apiUrl, filters = {}) {
    const clean = String(apiUrl || '').trim();
    if (!clean) return queryLocalGuests(filters);

    const scope = String(filters.scope || 'all');
    const side = String(filters.side || 'all');
    const pageSize = Math.max(1, Math.min(50, parseInt(filters.pageSize, 10) || 10));
    const page = Math.max(1, parseInt(filters.page, 10) || 1);

    const baseParams = {
      action: 'list_guests',
      scope,
      side,
      type: filters.type || 'all',
      rsvp: filters.rsvp || 'all',
      viewed: filters.viewed || 'all',
      q: filters.q || '',
      page: String(page),
      pageSize: String(pageSize),
      t: String(Date.now())
    };

    const data = await sheetGet(clean, baseParams);

    // If GAS already applied role scoping natively, return directly
    if (scope === 'all' || data.scopeApplied) {
      return { ...data, source: 'google_sheet' };
    }

    // Backward-compatible guard when user hasn't redeployed updated GAS yet:
    // Fetch only permitted sides (groom+both or bride+both) so the other family's records never leak.
    const ownSide = scope === 'groom' ? 'groom' : 'bride';
    if (side === ownSide || side === 'both') {
      const safeItems = (Array.isArray(data.items) ? data.items : []).filter((r) => isRowAllowedForScope(r, scope));
      return { ...data, items: safeItems, source: 'google_sheet' };
    }

    const [ownRes, bothRes] = await Promise.all([
      sheetGet(clean, { ...baseParams, side: ownSide, page: '1', pageSize: '50' }),
      sheetGet(clean, { ...baseParams, side: 'both', page: '1', pageSize: '50' })
    ]);
    const combined = [...(ownRes.items || []), ...(bothRes.items || [])].filter((r) => isRowAllowedForScope(r, scope));
    const totalFiltered = combined.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.max(1, Math.min(totalPages, page));
    const start = (safePage - 1) * pageSize;

    return {
      ok: true,
      source: 'google_sheet',
      stats: computeGuestStats(combined),
      page: safePage,
      pageSize,
      totalFiltered,
      totalPages,
      items: combined.slice(start, start + pageSize)
    };
  }

  async function listSheetWishes(apiUrl) {
    const clean = String(apiUrl || '').trim();
    if (!clean) return { ok: true, wishes: [] };
    try {
      return await sheetGet(clean, { action: 'list_wishes', t: String(Date.now()) });
    } catch (_) {
      return { ok: false, wishes: [] };
    }
  }

  window.WeddingStore = {
    DEFAULT_CONFIG,
    clone,
    mergeConfig,
    loadConfig,
    loadLocalConfig,
    saveLocalConfig,
    clearLocalConfig,
    solarToLunar,
    parseDateParts,
    formatFullAddress,
    formatShortAddressHtml,
    buildMapUrl,
    buildMapEmbedUrl,
    resolveAsset,
    compressImageFile,
    verifyGitHubToken,
    fetchLatestGitHubConfig,
    publishConfigToGitHub,
    upsertLocalGuest,
    queryLocalGuests,
    sheetGet,
    sheetPost,
    pingSheet,
    listSheetGuests,
    listSheetWishes
  };
})();
