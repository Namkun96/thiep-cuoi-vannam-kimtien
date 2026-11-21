/* ==========================================================================
   THIỆP CƯỚI VĂN NAM & KIM TIẾN — LUXURY INDOCHINE EDITORIAL ENGINE
   Supports 3 independent switcher-free URLs:
     - /           (mode="both"     — Đầy đủ Nhà Trai & Nhà Gái)
     - /nha-trai/  (mode="nha-trai" — Riêng Nhà Trai, 16:30 · 02/01/2027)
     - /nha-gai/   (mode="nha-gai"  — Riêng Nhà Gái,  16:30 · 02/01/2027)
   ========================================================================== */

(() => {
  'use strict';

  const mode = document.body.dataset.mode || 'both';
  const base = document.body.dataset.base || '.';
  const asset = (p) => `${base}/${p}`;

  /* =========================================================================
     CẤU HÌNH TRUNG TÂM — CHỈ CẦN SỬA TẠI ĐÂY KHI CẬP NHẬT THÔNG TIN THẬT
     ========================================================================= */
  const CONFIG = {
    groomName: 'Nguyễn Văn Nam',
    brideName: 'Nguyễn Thị Kim Tiến',
    groomParent: 'Bà: Nguyễn Thị ...',
    brideParent: 'Bà: Trần Thị ...',
    groomHomeShort: 'Thị trấn Kim Bài, Thanh Oai<br/>TP. Hà Nội',
    brideHomeShort: 'Thôn Cầu Cả, Cổ Loa, Đông Anh<br/>TP. Hà Nội',

    groomBank: {
      name: 'Vietcombank — CN Hà Nội',
      acc: '0011 0045 67890',
      owner: 'NGUYEN VAN NAM',
      qrImage: ''
    },
    brideBank: {
      name: 'Techcombank — CN Đông Anh',
      acc: '1903 8899 12345',
      owner: 'NGUYEN THI KIM TIEN',
      qrImage: ''
    },

    // Dán link Google Apps Script Web App để tự động lưu xác nhận RSVP về Google Sheet:
    RSVP_ENDPOINT: '',

    photos: {
      hero: asset('images/hero-arch.webp'),
      interlude: asset('images/banner-rings.webp'),
      storyBg: asset('images/hands-rings.webp'),
      polaroidGroom: asset('images/arch-closeup.webp'),
      polaroidBride: asset('images/aodai-closeup.webp'),
      vinylLabel: asset('images/arch-closeup.webp'),
      rsvpThanks: asset('images/aodai-closeup.webp'),
      footerBg: asset('images/banner-rings.webp'),
      album: [
        asset('images/banner-rings.webp'),
        asset('images/aodai-full.webp'),
        asset('images/arch-closeup.webp'),
        asset('images/hands-rings.webp'),
        asset('images/hero-arch.webp'),
        asset('images/aodai-closeup.webp'),
        asset('images/bouquet.webp')
      ]
    },

    // Minimalist line-art SVG icons matching the Jmii Timeline
    icons: {
      camera: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h5l2.5-3.5h11L28 14h5a2.5 2.5 0 0 1 2.5 2.5v13A2.5 2.5 0 0 1 33 32H7a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 7 14Z"/><circle cx="20" cy="22.5" r="5.5"/><circle cx="30" cy="18" r="1" fill="currentColor"/></svg>`,
      rings: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="15.5" cy="23" r="8"/><circle cx="24.5" cy="23" r="8"/><path d="M15.5 11.5 13 8.5h5l-2.5 3Z"/><path d="M15.5 11.5v3.5"/></svg>`,
      feast: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M8 26h24"/><path d="M10 26a10 10 0 0 1 20 0"/><path d="M20 16v-2.5"/><circle cx="20" cy="12" r="1.5"/><path d="M6 29.5h28"/></svg>`,
      car: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M9 24h22l-2.5-7.5A2 2 0 0 0 26.6 15H13.4a2 2 0 0 0-1.9 1.5L9 24Z"/><path d="M7 24h26v4.5a1.5 1.5 0 0 1-1.5 1.5h-23A1.5 1.5 0 0 1 7 28.5V24Z"/><circle cx="13" cy="27" r="1.4"/><circle cx="27" cy="27" r="1.4"/><path d="M20 11.5c0 0 2.5-2.5 4.2-1 1.4 1.3 0 3.3-4.2 4.5-4.2-1.2-5.6-3.2-4.2-4.5 1.7-1.5 4.2 1 4.2 1Z"/></svg>`,
      music: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28V12l14-2.5V25"/><circle cx="13" cy="28" r="3"/><circle cx="27" cy="25" r="3"/><path d="M16 16.5 30 14"/></svg>`
    },

    venues: {
      groom: {
        title: 'Tư Gia Nhà Trai',
        addr: 'Thị trấn Kim Bài, Huyện Thanh Oai, TP. Hà Nội',
        note: 'Có chỗ đỗ xe thuận tiện ngay gần rạp tiệc',
        mapUrl: 'https://www.google.com/maps/search/?api=1&query=Thi+tran+Kim+Bai+Thanh+Oai+Ha+Noi',
        embedUrl: 'https://maps.google.com/maps?q=Thi+tran+Kim+Bai+Thanh+Oai+Ha+Noi&t=m&z=15&ie=UTF8&iwloc=&output=embed'
      },
      bride: {
        title: 'Tư Gia Nhà Gái',
        addr: 'Thôn Cầu Cả, Xã Cổ Loa, Huyện Đông Anh, TP. Hà Nội',
        note: 'Bãi đỗ ô tô đầu đường cách tư gia khoảng 10 phút đi bộ nhẹ',
        mapUrl: 'https://www.google.com/maps/search/?api=1&query=Thon+Cau+Ca+Co+Loa+Dong+Anh+Ha+Noi',
        embedUrl: 'https://maps.google.com/maps?q=Thon+Cau+Ca+Co+Loa+Dong+Anh+Ha+Noi&t=m&z=15&ie=UTF8&iwloc=&output=embed'
      }
    },

    modes: {
      both: {
        isBrideFirst: false,
        heroDateSub: '02 – 03 . 01 . 2027',
        countdownTarget: '2027-01-02T16:30:00+07:00',
        showSideSelect: true,
        venueKeys: ['groom', 'bride'],
        events: [
          {
            tag: 'Nhà Trai · Lễ Thành Hôn',
            timeVal: '16:30, THỨ BẢY (TIỆC CƯỚI) · 08:00, CHỦ NHẬT (LỄ CHÍNH)',
            month: 'THÁNG 01',
            day: '02',
            year: 'NĂM 2027',
            lunar: '(Tức ngày 25 – 26 tháng 11 năm Bính Ngọ)',
            subNote: 'Tổ chức tại Tư gia Nhà Trai — Thị trấn Kim Bài, Thanh Oai'
          },
          {
            tag: 'Nhà Gái · Lễ Vu Quy',
            timeVal: '16:30, THỨ BẢY (TIỆC CƯỚI) · 09:30, CHỦ NHẬT (LỄ CHÍNH)',
            month: 'THÁNG 01',
            day: '02',
            year: 'NĂM 2027',
            lunar: '(Tức ngày 25 – 26 tháng 11 năm Bính Ngọ)',
            subNote: 'Tổ chức tại Tư gia Nhà Gái — Thôn Cầu Cả, Cổ Loa, Đông Anh'
          }
        ],
        timeline: [
          { time: '16:30 · 02/01', label: 'Đón Khách & Tiệc Cưới', sub: 'Khai tiệc thân mật tại Tư gia Nhà Trai & Nhà Gái', icon: 'feast' },
          { time: '08:00 · 03/01', label: 'Cỗ Sáng & Đón Khách', sub: 'Đón họ hàng, khách quý hai gia đình', icon: 'camera' },
          { time: '11:15 · 03/01', label: 'Lễ Vu Quy & Xin Dâu', sub: 'Nghi lễ gia tiên tại Cổ Loa, Đông Anh', icon: 'rings' },
          { time: '13:15 · 03/01', label: 'Lễ Thành Hôn', sub: 'Đón tân nương nhập gia tại Kim Bài, Thanh Oai', icon: 'car' }
        ]
      },

      'nha-trai': {
        isBrideFirst: false,
        heroDateSub: '16:30 · 02 . 01 . 2027',
        countdownTarget: '2027-01-02T16:30:00+07:00',
        showSideSelect: false,
        venueKeys: ['groom'],
        events: [
          {
            tag: 'Tiệc Cưới Nhà Trai',
            timeVal: '16:30, THỨ BẢY',
            month: 'THÁNG 01',
            day: '02',
            year: 'NĂM 2027',
            lunar: '(Tức ngày 25 tháng 11 năm Bính Ngọ)',
            subNote: 'Đón tiếp Quý khách, bạn bè & đồng nghiệp chung vui cùng gia đình'
          },
          {
            tag: 'Lễ Thành Hôn',
            timeVal: '08:00, CHỦ NHẬT',
            month: 'THÁNG 01',
            day: '03',
            year: 'NĂM 2027',
            lunar: '(Tức ngày 26 tháng 11 năm Bính Ngọ)',
            subNote: 'Cỗ sáng từ 08:00 · 10:00 Rước dâu · 13:15 Đón dâu nhập gia'
          }
        ],
        timeline: [
          { time: '16:30 · 02/01', label: 'Đón Khách & Check-in', sub: 'Đón tiếp bạn bè, đồng nghiệp tại Tư gia Nhà Trai', icon: 'camera' },
          { time: '17:30 · 02/01', label: 'Khai Tiệc Thân Mật', sub: 'Nâng ly chúc mừng cùng gia đình Nhà Trai', icon: 'feast' },
          { time: '19:30 · 02/01', label: 'Giao Lưu & Âm Nhạc', sub: 'Lưu giữ khoảnh khắc ấm áp bên người thương', icon: 'music' },
          { time: '13:15 · 03/01', label: 'Lễ Thành Hôn', sub: 'Đón tân nương nhập gia đúng giờ hoàng đạo', icon: 'rings' }
        ]
      },

      'nha-gai': {
        isBrideFirst: true,
        heroDateSub: '16:30 · 02 . 01 . 2027',
        countdownTarget: '2027-01-02T16:30:00+07:00',
        showSideSelect: false,
        venueKeys: ['bride'],
        events: [
          {
            tag: 'Tiệc Cưới Nhà Gái',
            timeVal: '16:30, THỨ BẢY',
            month: 'THÁNG 01',
            day: '02',
            year: 'NĂM 2027',
            lunar: '(Tức ngày 25 tháng 11 năm Bính Ngọ)',
            subNote: 'Đón tiếp Quý khách, bạn bè & người thân chung vui cùng gia đình'
          },
          {
            tag: 'Lễ Vu Quy',
            timeVal: '09:30, CHỦ NHẬT',
            month: 'THÁNG 01',
            day: '03',
            year: 'NĂM 2027',
            lunar: '(Tức ngày 26 tháng 11 năm Bính Ngọ)',
            subNote: '09:30 Đón khách · 11:15 Lễ Xin Dâu · 11:45 Lễ Đưa Dâu'
          }
        ],
        timeline: [
          { time: '16:30 · 02/01', label: 'Đón Khách & Check-in', sub: 'Đón tiếp bạn bè & khách quý tại Tư gia Nhà Gái', icon: 'camera' },
          { time: '17:30 · 02/01', label: 'Khai Tiệc Thân Mật', sub: 'Chung vui cùng gia đình Nhà Gái tại Cổ Loa', icon: 'feast' },
          { time: '11:15 · 03/01', label: 'Lễ Vu Quy & Xin Dâu', sub: 'Nghi lễ gia tiên trang trọng giờ Ngọ cát lợi', icon: 'rings' },
          { time: '11:45 · 03/01', label: 'Lễ Đưa Dâu', sub: 'Đoàn xe hoa đưa tân nương về Nhà Trai', icon: 'car' }
        ]
      }
    }
  };

  const $ = (id) => document.getElementById(id);
  const cfg = CONFIG.modes[mode] || CONFIG.modes.both;
  const params = new URLSearchParams(window.location.search);
  const customGuest = (params.get('khach') || '').trim();
  const guestDisplay = customGuest || 'Quý Khách & Gia Đình';

  let lbIndex = 0;

  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
  }

  /* ===== 1. HYDRATE CONTENT FOR ACTIVE MODE ===== */
  function hydrate() {
    const first = cfg.isBrideFirst ? CONFIG.brideName : CONFIG.groomName;
    const second = cfg.isBrideFirst ? CONFIG.groomName : CONFIG.brideName;

    // Door overlay
    $('doorCouple').innerHTML = `${first}<span class="door-amp">&amp;</span>${second}`;
    $('doorGuestLine').textContent = `Kính mời: ${guestDisplay}`;

    // Hero cover
    $('heroCoverImg').src = CONFIG.photos.hero;
    $('heroCoupleNames').innerHTML = `<span class="name-line">${first}</span><span class="amp">&amp;</span><span class="name-line">${second}</span>`;
    $('heroDateSub').textContent = cfg.heroDateSub;

    // Self-opening envelope letter
    $('letterNames').innerHTML = `<span class="letter-line">${first}</span><span class="amp-small">&amp;</span><span class="letter-line">${second}</span>`;

    // Interlude photo
    $('interludeImg').src = CONFIG.photos.interlude;

    // Formal Two Families (Vietnamese etiquette ordering)
    if (!cfg.isBrideFirst) {
      $('famLeftVi').textContent = 'Nhà Trai';
      $('famLeftEn').textContent = "Groom's Side";
      $('famLeftParent').textContent = CONFIG.groomParent;
      $('famLeftAddr').innerHTML = CONFIG.groomHomeShort;
      $('famRightVi').textContent = 'Nhà Gái';
      $('famRightEn').textContent = "Bride's Side";
      $('famRightParent').textContent = CONFIG.brideParent;
      $('famRightAddr').innerHTML = CONFIG.brideHomeShort;

      $('polaroid1Img').src = CONFIG.photos.polaroidGroom;
      $('polaroid1Role').textContent = 'The Groom';
      $('polaroid1Name').textContent = CONFIG.groomName;
      $('polaroid2Img').src = CONFIG.photos.polaroidBride;
      $('polaroid2Role').textContent = 'The Bride';
      $('polaroid2Name').textContent = CONFIG.brideName;
    } else {
      $('famLeftVi').textContent = 'Nhà Gái';
      $('famLeftEn').textContent = "Bride's Side";
      $('famLeftParent').textContent = CONFIG.brideParent;
      $('famLeftAddr').innerHTML = CONFIG.brideHomeShort;
      $('famRightVi').textContent = 'Nhà Trai';
      $('famRightEn').textContent = "Groom's Side";
      $('famRightParent').textContent = CONFIG.groomParent;
      $('famRightAddr').innerHTML = CONFIG.groomHomeShort;

      $('polaroid1Img').src = CONFIG.photos.polaroidBride;
      $('polaroid1Role').textContent = 'The Bride';
      $('polaroid1Name').textContent = CONFIG.brideName;
      $('polaroid2Img').src = CONFIG.photos.polaroidGroom;
      $('polaroid2Role').textContent = 'The Groom';
      $('polaroid2Name').textContent = CONFIG.groomName;
    }

    // Formal Guest & Couple names
    $('formalGuestName').textContent = guestDisplay;
    $('formalNameTop').textContent = first;
    $('formalNameBottom').textContent = second;

    // Formal Event Time Blocks (clean date/time only, no duplicate map buttons)
    $('formalEventsList').innerHTML = cfg.events.map((ev, idx) => `
      <div class="formal-event reveal" style="--d:${idx * 90}ms;">
        <p class="fe-tag">${ev.tag}</p>
        <p class="fe-time-lead">Được tổ chức vào lúc</p>
        <p class="fe-time-val lnum">${ev.timeVal}</p>
        <div class="fe-date-triad lnum">
          <span class="fe-side">${ev.month}</span>
          <span class="fe-day-big">${ev.day}</span>
          <span class="fe-side">${ev.year}</span>
        </div>
        <p class="fe-lunar">${ev.lunar}</p>
        ${ev.subNote ? `<p class="fe-sub-note">${ev.subNote}</p>` : ''}
      </div>
    `).join('');

    // Unified Location Map Thumbnail Cards (1 clean mini map preview + 1 button per house)
    const isMultiVenue = cfg.venueKeys.length > 1;
    $('formalVenuesList').innerHTML = cfg.venueKeys.map((key, idx) => {
      const v = CONFIG.venues[key];
      const btnText = isMultiVenue
        ? (key === 'groom' ? 'Chỉ đường Nhà Trai' : 'Chỉ đường Nhà Gái')
        : 'Xem chỉ đường';
      return `
        <div class="venue-map-card reveal" style="--d:${idx * 100}ms;">
          <p class="fe-venue-kicker">Địa điểm tổ chức · Location</p>
          <p class="fe-venue-name">${v.title}</p>
          <p class="fe-venue-addr">${v.addr}</p>
          <a href="${v.mapUrl}" target="_blank" rel="noopener noreferrer" class="mini-map-thumb" aria-label="Mở bản đồ Google Maps tới ${v.title}">
            <iframe
              title="Bản đồ thu nhỏ ${v.title}"
              src="${v.embedUrl}"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              tabindex="-1"></iframe>
          </a>
          <p class="venue-map-note">${v.note}</p>
          <a href="${v.mapUrl}" target="_blank" rel="noopener noreferrer" class="fe-map-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${btnText}</span>
          </a>
        </div>
      `;
    }).join('');

    // Polaroid story bg
    $('storyBgImg').src = CONFIG.photos.storyBg;

    // Vertical Timeline
    $('timelineAxis').innerHTML = cfg.timeline.map((item, idx) => {
      const iconHtml = `<div class="tl-icon-wrap">${CONFIG.icons[item.icon] || CONFIG.icons.rings}</div>`;
      const textHtml = `
        <p class="tl-time-str lnum">${item.time}</p>
        <p class="tl-label-str">${item.label}</p>
        <p class="tl-sub-str">${item.sub}</p>
      `;
      const isEven = idx % 2 === 0;
      return `
        <div class="tl-row reveal" style="--d:${idx * 90}ms;">
          <div class="tl-col-left">${isEven ? iconHtml : textHtml}</div>
          <div class="tl-dot" aria-hidden="true"></div>
          <div class="tl-col-right">${isEven ? textHtml : iconHtml}</div>
        </div>
      `;
    }).join('');

    // Vinyl label & Album & Footer
    $('vinylLabelImg').src = CONFIG.photos.vinylLabel;
    $('rsvpThanksPhoto').src = CONFIG.photos.rsvpThanks;
    $('footerBgImg').src = CONFIG.photos.footerBg;
    $('footerBrand').textContent = `${first.toUpperCase()} ♥ ${second.toUpperCase()}`;

    document.querySelectorAll('[data-album-idx]').forEach((el) => {
      const i = parseInt(el.dataset.albumIdx, 10);
      const img = el.querySelector('img');
      if (img && CONFIG.photos.album[i]) img.src = CONFIG.photos.album[i];
    });

    // RSVP side dropdown only needed on dual-family root link
    if (!cfg.showSideSelect && $('rsvpSide')) {
      $('rsvpSide').classList.add('hidden');
    }

    // Gift cards & QR ordering
    if (cfg.isBrideFirst) {
      $('giftTileBride').style.order = '1';
      $('giftTileGroom').style.order = '2';
      $('brideQrCard').style.order = '1';
      $('groomQrCard').style.order = '2';
    }

    $('modalGroomName').textContent = CONFIG.groomName;
    $('modalBrideName').textContent = CONFIG.brideName;
    $('modalGroomBank').textContent = CONFIG.groomBank.name;
    $('modalGroomAcc').textContent = CONFIG.groomBank.acc;
    $('modalGroomOwner').textContent = CONFIG.groomBank.owner;
    $('modalBrideBank').textContent = CONFIG.brideBank.name;
    $('modalBrideAcc').textContent = CONFIG.brideBank.acc;
    $('modalBrideOwner').textContent = CONFIG.brideBank.owner;

    if (CONFIG.groomBank.qrImage) {
      $('groomQrImg').src = CONFIG.groomBank.qrImage;
      $('groomQrImg').classList.remove('hidden');
      $('groomQrSvg').classList.add('hidden');
    }
    if (CONFIG.brideBank.qrImage) {
      $('brideQrImg').src = CONFIG.brideBank.qrImage;
      $('brideQrImg').classList.remove('hidden');
      $('brideQrSvg').classList.add('hidden');
    }

    renderCalendar();
    updateCountdown();
  }

  /* ===== 2. MINIMALIST CALENDAR (JAN 2027) ===== */
  function renderCalendar() {
    const grid = $('calendarDays');
    if (!grid) return;
    grid.innerHTML = '';
    // Jan 1, 2027 is Friday -> 4 empty Mon..Thu cells
    for (let i = 0; i < 4; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= 31; d++) {
      const cell = document.createElement('div');
      if (d === 2) {
        cell.className = 'cal-heart-mark solid lnum';
        cell.innerHTML = `
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path d="M18 31 C18 31 5 22.8 5 13.5 C5 8.8 8.6 5.5 12.8 5.5 C15.4 5.5 17.2 7 18 8.6 C18.8 7 20.6 5.5 23.2 5.5 C27.4 5.5 31 8.8 31 13.5 C31 22.8 18 31 18 31 Z" fill="#6E0C17"/>
          </svg>
          <span>2</span>`;
      } else if (d === 3) {
        cell.className = 'cal-heart-mark outline lnum';
        cell.innerHTML = `
          <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 31 C18 31 5 22.8 5 13.5 C5 8.8 8.6 5.5 12.8 5.5 C15.4 5.5 17.2 7 18 8.6 C18.8 7 20.6 5.5 23.2 5.5 C27.4 5.5 31 8.8 31 13.5 C31 22.8 18 31 18 31 Z" fill="rgba(110,12,23,0.08)" stroke="#6E0C17" stroke-width="1.5"/>
          </svg>
          <span>3</span>`;
      } else {
        const isSun = (d + 4) % 7 === 0;
        cell.className = 'cal-cell lnum' + (isSun ? ' sun' : '');
        cell.textContent = d;
      }
      grid.appendChild(cell);
    }
  }

  /* ===== 3. LIVE COUNTDOWN (INSIDE RISING ENVELOPE CARD) ===== */
  function updateCountdown() {
    const target = new Date(cfg.countdownTarget).getTime();
    const diff = Math.max(0, target - Date.now());
    $('cdDays').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
    $('cdHours').textContent = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0');
    $('cdMins').textContent = String(Math.floor((diff / 60000) % 60)).padStart(2, '0');
    $('cdSecs').textContent = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  }

  /* ===== 4. SCROLL REVEAL & SELF-OPENING ENVELOPE ===== */
  function initObservers() {
    const reveals = document.querySelectorAll('.reveal');
    const envScene = $('envScene');

    if (!('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('in-view'));
      envScene?.classList.add('is-open');
      return;
    }

    const revealIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -24px 0px' }
    );
    reveals.forEach((el) => revealIo.observe(el));

    if (envScene) {
      const envIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => envScene.classList.add('is-open'), 180);
              envIo.unobserve(envScene);
            }
          });
        },
        { threshold: 0.35 }
      );
      envIo.observe(envScene);
      envScene.addEventListener('click', () => envScene.classList.toggle('is-open'));
    }
  }

  /* ===== 5. AUDIO ENGINE ("BEAUTIFUL IN WHITE") SYNCED WITH VINYL & FAB ===== */
  const bgMusic = $('bgMusic');
  const musicBtn = $('musicToggleBtn');
  const vinylSection = $('vinylSection');
  const vinylPlayIcon = $('vinylPlayIcon');
  const MUSIC_TARGET_VOL = 0.65;
  let musicUserPaused = false;
  let musicResumeOnVisible = false;
  let musicFadeRaf = null;

  function syncAudioUI(playing) {
    musicBtn?.classList.toggle('is-playing', playing);
    musicBtn?.setAttribute('aria-pressed', playing ? 'true' : 'false');
    vinylSection?.classList.toggle('is-playing', playing);
    if (vinylPlayIcon) {
      vinylPlayIcon.innerHTML = playing
        ? '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'
        : '<polygon points="7,4 20,12 7,20" fill="currentColor"/>';
    }
  }

  function cancelFade() {
    if (musicFadeRaf) {
      cancelAnimationFrame(musicFadeRaf);
      musicFadeRaf = null;
    }
  }

  function fadeTo(target, durationMs, done) {
    cancelFade();
    const startVol = bgMusic.volume;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / Math.max(1, durationMs));
      const eased = 1 - Math.pow(1 - p, 2);
      try { bgMusic.volume = Math.max(0, Math.min(1, startVol + (target - startVol) * eased)); } catch (_) {}
      if (p < 1) {
        musicFadeRaf = requestAnimationFrame(tick);
      } else {
        musicFadeRaf = null;
        if (done) done();
      }
    };
    musicFadeRaf = requestAnimationFrame(tick);
  }

  function startMusic(durationMs = 2400) {
    if (!bgMusic) return;
    cancelFade();
    if (bgMusic.paused) {
      try { bgMusic.volume = 0.02; } catch (_) {}
    }
    const pr = bgMusic.play();
    if (pr && typeof pr.then === 'function') {
      pr.then(() => {
        syncAudioUI(true);
        fadeTo(MUSIC_TARGET_VOL, durationMs);
      }).catch(() => syncAudioUI(false));
    } else {
      syncAudioUI(true);
      fadeTo(MUSIC_TARGET_VOL, durationMs);
    }
  }

  function stopMusic(smooth = true) {
    if (!bgMusic) return;
    cancelFade();
    if (bgMusic.paused) {
      syncAudioUI(false);
      return;
    }
    if (smooth) {
      fadeTo(0, 260, () => {
        bgMusic.pause();
        syncAudioUI(false);
      });
    } else {
      bgMusic.pause();
      syncAudioUI(false);
    }
  }

  function toggleMusic() {
    if (!bgMusic) return;
    if (bgMusic.paused) {
      musicUserPaused = false;
      startMusic(1100);
      showToast('Đang phát: Beautiful in White 🎵');
    } else {
      musicUserPaused = true;
      musicResumeOnVisible = false;
      stopMusic(true);
      showToast('Đã tạm dừng nhạc nền');
    }
  }

  if (bgMusic) {
    bgMusic.addEventListener('play', () => syncAudioUI(true));
    bgMusic.addEventListener('pause', () => syncAudioUI(false));
    musicBtn?.addEventListener('click', toggleMusic);
    $('vinylPlayBtn')?.addEventListener('click', toggleMusic);
    $('vinylStage')?.addEventListener('click', toggleMusic);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!bgMusic.paused) {
          musicResumeOnVisible = true;
          stopMusic(false);
        }
      } else if (musicResumeOnVisible && !musicUserPaused) {
        musicResumeOnVisible = false;
        startMusic(1000);
      }
    });
    window.addEventListener('pagehide', () => {
      if (!bgMusic.paused) {
        musicResumeOnVisible = true;
        stopMusic(false);
      }
    });
  }

  /* ===== 6. IMPERIAL DOUBLE-DOOR OPENING ===== */
  function openDoors() {
    const overlay = $('doorOverlay');
    if (!overlay || overlay.classList.contains('opened')) return;
    overlay.classList.add('opened');
    setTimeout(() => document.body.classList.add('hero-ready'), 360);
    if (!musicUserPaused) startMusic(2400);
  }
  $('doorStage')?.addEventListener('click', openDoors);

  /* ===== 7. GIFT QR MODAL ===== */
  const qrModal = $('giftQrModal');
  function setQrTab(tab) {
    document.querySelectorAll('.qr-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.qrTab === tab);
    });
    $('groomQrCard').classList.toggle('hidden', tab === 'bride');
    $('brideQrCard').classList.toggle('hidden', tab === 'groom');
    $('qrGrid').classList.toggle('two-cols', tab === 'both');
  }
  document.querySelectorAll('.btn-open-gift').forEach((btn) => {
    btn.addEventListener('click', () => {
      setQrTab(btn.dataset.qrOpen || 'both');
      qrModal.classList.remove('hidden');
    });
  });
  $('btnCloseGift')?.addEventListener('click', () => qrModal.classList.add('hidden'));
  qrModal?.addEventListener('click', (e) => { if (e.target === qrModal) qrModal.classList.add('hidden'); });
  document.querySelectorAll('.qr-tab').forEach((b) => {
    b.addEventListener('click', () => setQrTab(b.dataset.qrTab));
  });
  $('btnCopyGroom')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(CONFIG.groomBank.acc.replace(/\s+/g, '')).then(() => showToast('Đã copy STK Chú Rể!'));
  });
  $('btnCopyBride')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(CONFIG.brideBank.acc.replace(/\s+/g, '')).then(() => showToast('Đã copy STK Cô Dâu!'));
  });
  function saveQr(imgId, svgId, filename) {
    const img = $(imgId);
    if (img && !img.classList.contains('hidden') && img.src) {
      const a = document.createElement('a');
      a.href = img.src;
      a.download = filename + '.png';
      a.click();
      showToast('Đang tải ảnh QR...');
      return;
    }
    const svg = $(svgId);
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.svg';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã lưu ảnh mã QR!');
  }
  $('btnDlGroom')?.addEventListener('click', () => saveQr('groomQrImg', 'groomQrSvg', 'QR-Chu-Re-Van-Nam'));
  $('btnDlBride')?.addEventListener('click', () => saveQr('brideQrImg', 'brideQrSvg', 'QR-Co-Dau-Kim-Tien'));

  /* ===== 8. PHOTO LIGHTBOX ===== */
  const lb = $('photoLightbox');
  const lbImg = $('lightboxImg');
  function openLb(idx, customSrc) {
    if (customSrc) {
      lbImg.src = customSrc;
      $('lbCounter').textContent = 'Nguyễn Văn Nam & Nguyễn Thị Kim Tiến';
      $('btnLbPrev').classList.add('hidden');
      $('btnLbNext').classList.add('hidden');
    } else {
      const list = CONFIG.photos.album;
      lbIndex = (idx + list.length) % list.length;
      lbImg.src = list[lbIndex];
      $('lbCounter').textContent = `${lbIndex + 1} / ${list.length}`;
      $('btnLbPrev').classList.remove('hidden');
      $('btnLbNext').classList.remove('hidden');
    }
    lb.classList.remove('hidden');
  }
  $('interludePhoto')?.addEventListener('click', () => openLb(0, $('interludeImg').src));
  $('polaroidCard1')?.addEventListener('click', () => openLb(0, $('polaroid1Img').src));
  $('polaroidCard2')?.addEventListener('click', () => openLb(0, $('polaroid2Img').src));
  $('secAlbum')?.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-album-idx]');
    if (tile) openLb(parseInt(tile.dataset.albumIdx, 10));
  });
  $('btnLbPrev')?.addEventListener('click', () => openLb(lbIndex - 1));
  $('btnLbNext')?.addEventListener('click', () => openLb(lbIndex + 1));
  $('btnCloseLb')?.addEventListener('click', () => lb.classList.add('hidden'));
  lb?.addEventListener('click', (e) => { if (e.target === lb) lb.classList.add('hidden'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      lb?.classList.add('hidden');
      qrModal?.classList.add('hidden');
      $('rsvpThanksModal')?.classList.add('hidden');
    }
    if (lb && !lb.classList.contains('hidden') && !$('btnLbNext').classList.contains('hidden')) {
      if (e.key === 'ArrowRight') openLb(lbIndex + 1);
      if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
    }
  });
  let touchX = 0;
  lb?.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].screenX; }, { passive: true });
  lb?.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - touchX;
    if (Math.abs(dx) > 40 && !$('btnLbNext').classList.contains('hidden')) {
      openLb(dx < 0 ? lbIndex + 1 : lbIndex - 1);
    }
  }, { passive: true });

  /* ===== 9. RSVP FORM + JMII-STYLE THANK-YOU CONFIRMATION POPUP ===== */
  const thanksModal = $('rsvpThanksModal');
  $('btnCloseThanks')?.addEventListener('click', () => thanksModal.classList.add('hidden'));
  thanksModal?.addEventListener('click', (e) => { if (e.target === thanksModal) thanksModal.classList.add('hidden'); });

  function appendWish(name, tag, msg) {
    const div = document.createElement('div');
    div.className = 'wish-card';
    div.innerHTML = '<div class="wish-top"><span class="wish-author"></span><span class="wish-tag"></span></div><p class="wish-body"></p>';
    div.querySelector('.wish-author').textContent = name;
    div.querySelector('.wish-tag').textContent = tag;
    div.querySelector('.wish-body').textContent = msg;
    $('wishesList')?.prepend(div);
  }

  $('rsvpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('rsvpName').value.trim();
    if (!name) return;
    const status = $('rsvpStatus').value;
    const count = $('rsvpCount').value;
    const side = cfg.showSideSelect ? $('rsvpSide').value : (mode === 'nha-gai' ? 'Khách Nhà Gái' : 'Khách Nhà Trai');
    const wish = $('rsvpWish').value.trim() || 'Chúc Nguyễn Văn Nam & Nguyễn Thị Kim Tiến trăm năm hạnh phúc!';
    const submitBtn = $('rsvpSubmitBtn');

    if (CONFIG.RSVP_ENDPOINT) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang gửi...';
      try {
        await fetch(CONFIG.RSVP_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            mode,
            name,
            status,
            count,
            side,
            wish
          })
        });
      } catch (_) {}
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send · Xác Nhận';
    }

    appendWish(name, `${status} · ${count}`, wish);
    $('rsvpForm').reset();
    thanksModal?.classList.remove('hidden');
  });

  /* ===== 10. FIXED FOOTER QUICK-NAVIGATION MENU & SCROLL-SPY ===== */
  function initBottomNav() {
    const navItems = Array.from(document.querySelectorAll('#bottomNav [data-target]'));
    if (!navItems.length) return;

    const setActive = (targetId) => {
      navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === targetId));
    };

    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const el = $(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActive(targetId);
        }
      });
    });

    if ('IntersectionObserver' in window) {
      const sections = navItems.map((btn) => $(btn.dataset.target)).filter(Boolean);
      const navIo = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible.length) setActive(visible[0].target.id);
        },
        { rootMargin: '-18% 0px -48% 0px', threshold: [0.05, 0.25, 0.5] }
      );
      sections.forEach((sec) => navIo.observe(sec));
    }
  }

  /* ===== INIT ===== */
  hydrate();
  initObservers();
  initBottomNav();
  setInterval(updateCountdown, 1000);
})();
