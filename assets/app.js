/* ==========================================================================
   THIỆP CƯỚI VĂN NAM & KIM TIẾN — SHARED APPLICATION LOGIC
   Supports 3 clean switcher-free links:
     - /           (mode="both"     — Thiệp chung 2 gia đình)
     - /nha-trai/  (mode="nha-trai" — Thiệp riêng Nhà Trai, 16h30 02/01/2027)
     - /nha-gai/   (mode="nha-gai"  — Thiệp riêng Nhà Gái,  16h30 02/01/2027)
   Supports ?khach=Tên+Khách+Mời on all 3 URLs!
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
    groomName: 'Văn Nam',
    brideName: 'Kim Tiến',
    groomParent: 'Bà: Nguyễn Thị ...',
    brideParent: 'Bà: Trần Thị ...',
    groomHomeShort: 'Thị trấn Kim Bài, Thanh Oai<br/>TP. Hà Nội',
    brideHomeShort: 'Thôn Cầu Cả, Cổ Loa, Đông Anh<br/>TP. Hà Nội',

    // Thông tin ngân hàng & đường dẫn ảnh QR thật (để trống "" sẽ hiện QR mẫu)
    groomBank: {
      name: 'Vietcombank — CN Hà Nội',
      acc: '0011 0045 67890',
      owner: 'NGUYEN VAN NAM',
      qrImage: ''
    },
    brideBank: {
      name: 'Techcombank — CN Đông Anh',
      acc: '1903 8899 12345',
      owner: 'KIM TIEN',
      qrImage: ''
    },

    // Dán link Google Apps Script Web App để tự động lưu xác nhận RSVP về Google Sheet:
    RSVP_ENDPOINT: '',

    // Danh sách ảnh cưới (thay ảnh thật chỉ cần thay file trong thư mục images/)
    photos: {
      hero: asset('images/hero-arch.webp'),
      duoGroom: asset('images/arch-closeup.webp'),
      duoBride: asset('images/aodai-closeup.webp'),
      strip1: asset('images/aodai-full.webp'),
      strip2: asset('images/hero-arch.webp'),
      strip3: asset('images/bouquet.webp'),
      album: [
        asset('images/aodai-full.webp'),
        asset('images/arch-closeup.webp'),
        asset('images/banner-rings.webp'),
        asset('images/bouquet.webp'),
        asset('images/hands-rings.webp'),
        asset('images/aodai-closeup.webp'),
        asset('images/hero-arch.webp')
      ],
      footer: asset('images/aodai-full.webp')
    },

    // Địa điểm tổ chức (có nhúng bản đồ Google Maps trực quan + link chỉ đường)
    venues: {
      groom: {
        title: 'TƯ GIA NHÀ TRAI',
        addr: 'Thị trấn Kim Bài, Huyện Thanh Oai, TP. Hà Nội',
        park: '🚗 Có chỗ đỗ xe thuận tiện ngay gần rạp tiệc',
        mapUrl: 'https://www.google.com/maps/search/?api=1&query=Thi+tran+Kim+Bai+Thanh+Oai+Ha+Noi',
        embedUrl: 'https://maps.google.com/maps?q=Thi+tran+Kim+Bai+Thanh+Oai+Ha+Noi&t=k&z=16&ie=UTF8&iwloc=&output=embed'
      },
      bride: {
        title: 'TƯ GIA NHÀ GÁI',
        addr: 'Thôn Cầu Cả, Xã Cổ Loa, Huyện Đông Anh, TP. Hà Nội',
        park: '🚶 Bãi đỗ ô tô đầu đường cách tư gia khoảng 10 phút đi bộ nhẹ',
        mapUrl: 'https://www.google.com/maps/search/?api=1&query=Thon+Cau+Ca+Co+Loa+Dong+Anh+Ha+Noi',
        embedUrl: 'https://maps.google.com/maps?q=Thon+Cau+Ca+Co+Loa+Dong+Anh+Ha+Noi&t=k&z=16&ie=UTF8&iwloc=&output=embed'
      }
    },

    // 3 chế độ link độc lập (không còn thanh chuyển đổi phiên bản)
    modes: {
      both: {
        isBrideFirst: false,
        envTitle: 'Thiệp Mời Lễ Thành Hôn & Vu Quy',
        envDate: '02 – 03 . 01 . 2027',
        heroMeta: 'T7 · <strong>02.01</strong> &nbsp;•&nbsp; CN · <strong>03.01.2027</strong>',
        announceHeading: 'Trân Trọng Thông Báo Lễ Thành Hôn &amp; Lễ Vu Quy',
        inviteSub: 'Đến dự bữa tiệc thân mật mừng hạnh phúc cùng hai gia đình chúng tôi',
        countdownLabel: 'Tiệc cưới sẽ diễn ra sau:',
        countdownTarget: '2027-01-02T16:30:00+07:00',
        primaryMap: 'groom',
        venueKeys: ['groom', 'bride'],
        events: [
          {
            title: 'Tiệc Cưới Nhà Trai',
            weekday: 'Thứ Bảy',
            time: '16H30',
            day: '02',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 25 tháng 11 năm Bính Ngọ)',
            note: 'Tổ chức tại Tư gia Nhà Trai — Thị trấn Kim Bài, Thanh Oai, Hà Nội',
            steps: [
              { t: '16:30', label: 'Đón khách' },
              { t: '17:30', label: 'Khai tiệc thân mật' },
              { t: '19:30', label: 'Giao lưu & chụp ảnh' }
            ]
          },
          {
            title: 'Tiệc Cưới Nhà Gái',
            weekday: 'Thứ Bảy',
            time: '16H30',
            day: '02',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 25 tháng 11 năm Bính Ngọ)',
            note: 'Tổ chức tại Tư gia Nhà Gái — Thôn Cầu Cả, Cổ Loa, Đông Anh, Hà Nội',
            steps: [
              { t: '16:30', label: 'Đón khách' },
              { t: '17:30', label: 'Khai tiệc thân mật' },
              { t: '19:30', label: 'Giao lưu & chụp ảnh' }
            ]
          },
          {
            title: 'Lễ Vu Quy',
            weekday: 'Chủ Nhật',
            time: '09H30',
            day: '03',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 26 tháng 11 năm Bính Ngọ)',
            note: 'Tại Tư gia Nhà Gái — Cổ Loa, Đông Anh',
            steps: [
              { t: '09:30', label: 'Đón khách & họ hàng' },
              { t: '11:15', label: 'Lễ Xin Dâu' },
              { t: '11:45', label: 'Lễ Đưa Dâu' }
            ]
          },
          {
            title: 'Lễ Thành Hôn',
            weekday: 'Chủ Nhật',
            time: '08H00',
            day: '03',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 26 tháng 11 năm Bính Ngọ)',
            note: 'Tại Tư gia Nhà Trai — Kim Bài, Thanh Oai',
            steps: [
              { t: '08:00', label: 'Cỗ sáng đón khách' },
              { t: '10:00', label: 'Đoàn rước dâu khởi hành' },
              { t: '13:15', label: 'Đón dâu nhập gia' }
            ]
          }
        ]
      },

      'nha-trai': {
        isBrideFirst: false,
        envTitle: 'Thiệp Mời Tiệc Cưới Nhà Trai',
        envDate: '16H30 · 02 . 01 . 2027',
        heroMeta: '16H30 · Thứ Bảy &nbsp;<strong>02.01.2027</strong>',
        announceHeading: 'Trân Trọng Thông Báo Lễ Thành Hôn',
        inviteSub: 'Đến dự bữa tiệc thân mật mừng hạnh phúc cùng gia đình Nhà Trai chúng tôi',
        countdownLabel: 'Tiệc cưới Nhà Trai diễn ra sau:',
        countdownTarget: '2027-01-02T16:30:00+07:00',
        primaryMap: 'groom',
        venueKeys: ['groom'],
        events: [
          {
            title: 'Tiệc Cưới Nhà Trai',
            weekday: 'Thứ Bảy',
            time: '16H30',
            day: '02',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 25 tháng 11 năm Bính Ngọ)',
            note: 'Đón tiếp Quý khách, bạn bè & đồng nghiệp tại Tư gia Nhà Trai',
            steps: [
              { t: '16:30', label: 'Đón khách & Check-in' },
              { t: '17:30', label: 'Khai tiệc thân mật' },
              { t: '19:30', label: 'Giao lưu & chụp ảnh' }
            ]
          },
          {
            title: 'Lễ Thành Hôn',
            weekday: 'Chủ Nhật',
            time: '08H00',
            day: '03',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 26 tháng 11 năm Bính Ngọ)',
            note: 'Nghi lễ gia tiên & đón tân nương về Tư gia Nhà Trai',
            steps: [
              { t: '08:00', label: 'Cỗ sáng đón khách' },
              { t: '10:00', label: 'Khởi hành rước dâu' },
              { t: '11:15', label: 'Lễ Xin Dâu' },
              { t: '13:15', label: 'Đón dâu nhập gia' }
            ]
          }
        ]
      },

      'nha-gai': {
        isBrideFirst: true,
        envTitle: 'Thiệp Mời Tiệc Cưới Nhà Gái',
        envDate: '16H30 · 02 . 01 . 2027',
        heroMeta: '16H30 · Thứ Bảy &nbsp;<strong>02.01.2027</strong>',
        announceHeading: 'Trân Trọng Thông Báo Lễ Vu Quy',
        inviteSub: 'Đến dự bữa tiệc thân mật mừng hạnh phúc cùng gia đình Nhà Gái chúng tôi',
        countdownLabel: 'Tiệc cưới Nhà Gái diễn ra sau:',
        countdownTarget: '2027-01-02T16:30:00+07:00',
        primaryMap: 'bride',
        venueKeys: ['bride'],
        events: [
          {
            title: 'Tiệc Cưới Nhà Gái',
            weekday: 'Thứ Bảy',
            time: '16H30',
            day: '02',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 25 tháng 11 năm Bính Ngọ)',
            note: 'Đón tiếp Quý khách, bạn bè & người thân tại Tư gia Nhà Gái',
            steps: [
              { t: '16:30', label: 'Đón khách & Check-in' },
              { t: '17:30', label: 'Khai tiệc thân mật' },
              { t: '19:30', label: 'Giao lưu & chụp ảnh' }
            ]
          },
          {
            title: 'Lễ Vu Quy',
            weekday: 'Chủ Nhật',
            time: '09H30',
            day: '03',
            month: 'Tháng 01',
            year: '2027',
            lunar: '(Tức ngày 26 tháng 11 năm Bính Ngọ)',
            note: 'Nghi lễ gia tiên & đưa tân nương tại Tư gia Nhà Gái',
            steps: [
              { t: '09:30', label: 'Đón khách & họ hàng' },
              { t: '11:15', label: 'Đón đoàn & Lễ Xin Dâu' },
              { t: '11:45', label: 'Lễ Đưa Dâu về Nhà Trai' }
            ]
          }
        ]
      }
    }
  };

  const $ = (id) => document.getElementById(id);
  const cfg = CONFIG.modes[mode] || CONFIG.modes.both;
  const params = new URLSearchParams(window.location.search);
  const customGuest = (params.get('khach') || '').trim();
  const guestDisplay = customGuest || 'Quý Khách & Gia Đình';

  let rsvpStatus = 'Sẽ tham dự';
  let lbIndex = 0;

  function lastInitial(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1][0].toUpperCase() : 'H';
  }

  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
  }

  function spawnBurstHearts(originX, originY, count = 14) {
    const icons = ['♥', '❤', '♡', '✦'];
    const colors = ['#A81D24', '#D94B57', '#C29663', '#E88B95'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'burst-heart';
      el.textContent = icons[i % icons.length];
      el.style.left = `${originX}px`;
      el.style.top = `${originY}px`;
      el.style.color = colors[i % colors.length];
      el.style.fontSize = `${13 + (i % 4) * 4}px`;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 55 + Math.random() * 95;
      el.style.setProperty('--bx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--by', `${Math.sin(angle) * dist - 65}px`);
      el.style.setProperty('--br', `${(Math.random() - 0.5) * 70}deg`);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
  }

  /* ===== 1. CONTINUOUS FALLING MINI HEARTS (TIKTOK STYLE) ===== */
  function initFallingHearts() {
    const layer = $('heartsLayer');
    if (!layer) return;
    const glyphs = ['♥', '♥', '♡', '♥', '❤'];
    const palette = [
      'rgba(184, 34, 44, 0.52)',
      'rgba(217, 79, 92, 0.45)',
      'rgba(232, 138, 149, 0.5)',
      'rgba(194, 150, 99, 0.44)'
    ];
    const total = 18;
    for (let i = 0; i < total; i++) {
      const s = document.createElement('span');
      s.className = 'fall-heart';
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = `${4 + ((i * 5.4 + (i % 3) * 3.1) % 92)}%`;
      s.style.fontSize = `${9 + (i % 4) * 3}px`;
      s.style.color = palette[i % palette.length];
      s.style.setProperty('--dur', `${9.5 + (i % 6) * 2.1}s`);
      s.style.setProperty('--delay', `${-((i * 1.45) % 14)}s`);
      s.style.setProperty('--sway', `${(i % 2 === 0 ? 1 : -1) * (14 + (i % 4) * 6)}px`);
      s.style.setProperty('--op', `${0.34 + (i % 3) * 0.14}`);
      layer.appendChild(s);
    }
  }

  /* ===== 2. POPULATE CONTENT FOR CURRENT MODE ===== */
  function hydrateInvitation() {
    const first = cfg.isBrideFirst ? CONFIG.brideName : CONFIG.groomName;
    const second = cfg.isBrideFirst ? CONFIG.groomName : CONFIG.brideName;

    // Envelope
    $('envTitle').textContent = cfg.envTitle;
    $('envMonogram').textContent = `${lastInitial(first)} ♥ ${lastInitial(second)}`;
    $('envCoupleNames').textContent = `${first} & ${second}`;
    $('envDateStr').textContent = cfg.envDate;
    $('envGuestName').textContent = guestDisplay;

    // Hero
    $('heroFirstName').textContent = first;
    $('heroSecondName').textContent = second;
    $('heroMetaStrip').innerHTML = cfg.heroMeta;
    document.querySelectorAll('.trip-img').forEach((img) => { img.src = CONFIG.photos.hero; });

    // Quote & Two Families (auto-respect Vietnamese etiquette order)
    $('announceHeading').innerHTML = cfg.announceHeading;
    if (!cfg.isBrideFirst) {
      $('famLeftRole').textContent = 'Nhà Trai';
      $('famLeftParent').textContent = CONFIG.groomParent;
      $('famLeftHome').innerHTML = CONFIG.groomHomeShort;
      $('famRightRole').textContent = 'Nhà Gái';
      $('famRightParent').textContent = CONFIG.brideParent;
      $('famRightHome').innerHTML = CONFIG.brideHomeShort;
      $('duoLeftRole').textContent = 'Chú Rể';
      $('duoLeftName').textContent = CONFIG.groomName;
      $('duoRightRole').textContent = 'Cô Dâu';
      $('duoRightName').textContent = CONFIG.brideName;
      $('duoLeftImg').src = CONFIG.photos.duoGroom;
      $('duoRightImg').src = CONFIG.photos.duoBride;
    } else {
      $('famLeftRole').textContent = 'Nhà Gái';
      $('famLeftParent').textContent = CONFIG.brideParent;
      $('famLeftHome').innerHTML = CONFIG.brideHomeShort;
      $('famRightRole').textContent = 'Nhà Trai';
      $('famRightParent').textContent = CONFIG.groomParent;
      $('famRightHome').innerHTML = CONFIG.groomHomeShort;
      $('duoLeftRole').textContent = 'Cô Dâu';
      $('duoLeftName').textContent = CONFIG.brideName;
      $('duoRightRole').textContent = 'Chú Rể';
      $('duoRightName').textContent = CONFIG.groomName;
      $('duoLeftImg').src = CONFIG.photos.duoBride;
      $('duoRightImg').src = CONFIG.photos.duoGroom;
    }

    // Personalized Guest Invitation & 3-photo strip
    $('guestNameHero').textContent = guestDisplay;
    $('inviteSubtext').textContent = cfg.inviteSub;
    $('stripImg1').src = CONFIG.photos.strip1;
    $('stripImg2').src = CONFIG.photos.strip2;
    $('stripImg3').src = CONFIG.photos.strip3;

    // Event Schedule Triad Blocks
    const eventsEl = $('eventsList');
    eventsEl.innerHTML = cfg.events.map((ev, idx) => `
      <article class="event-block reveal" style="--d:${idx * 90}ms;">
        <div class="event-heading-row">
          <h3 class="event-title">${ev.title}</h3>
        </div>
        <p class="event-weekday">${ev.weekday}</p>
        <div class="event-triad">
          <div class="triad-time">${ev.time}</div>
          <div class="triad-day-box"><div class="triad-day-num">${ev.day}</div></div>
          <div class="triad-year">${ev.year}</div>
        </div>
        <p class="event-month">${ev.month}</p>
        <p class="event-lunar">${ev.lunar}</p>
        <p class="event-note">${ev.note}</p>
        <div class="mini-steps">
          ${ev.steps.map((st) => `<span class="mini-step-chip"><strong>${st.t}</strong> · ${st.label}</span>`).join('')}
        </div>
      </article>
    `).join('');

    // Venues with Embedded Google Maps + Direction Pill Buttons
    const venueListEl = $('venueList');
    venueListEl.innerHTML = cfg.venueKeys.map((key, idx) => {
      const v = CONFIG.venues[key];
      return `
        <div class="venue-block reveal" style="--d:${idx * 110}ms;">
          <h3 class="venue-heading">${v.title}</h3>
          <p class="venue-address">${v.addr}</p>
          <div class="map-embed-frame">
            <iframe
              title="Bản đồ ${v.title}"
              src="${v.embedUrl}"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen></iframe>
          </div>
          <p class="venue-park">${v.park}</p>
          <a href="${v.mapUrl}" target="_blank" rel="noopener noreferrer" class="btn-map-pill">
            <span>📍</span><span>Xem chỉ đường</span>
          </a>
        </div>
      `;
    }).join('');

    // Floating quick bar map link
    $('floatMapLink').href = CONFIG.venues[cfg.primaryMap].mapUrl;

    // Countdown Label & Calendar
    $('countdownLabel').textContent = cfg.countdownLabel;
    renderCalendar();
    updateCountdown();

    // Gift Boxes order (put host family first on dedicated link)
    const giftPair = $('giftPair');
    if (cfg.isBrideFirst) {
      $('giftCardBride').style.order = '1';
      $('giftCardGroom').style.order = '2';
      $('brideQrCard').style.order = '1';
      $('groomQrCard').style.order = '2';
    } else if (giftPair) {
      $('giftCardGroom').style.order = '1';
      $('giftCardBride').style.order = '2';
      $('groomQrCard').style.order = '1';
      $('brideQrCard').style.order = '2';
    }

    // Bank QR modal data
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

    // Editorial Album Grid
    document.querySelectorAll('[data-album-idx]').forEach((tile) => {
      const idx = parseInt(tile.dataset.albumIdx, 10);
      const img = tile.querySelector('img');
      if (img && CONFIG.photos.album[idx]) img.src = CONFIG.photos.album[idx];
    });

    // Footer full-bleed photo & monogram
    $('footerHeroImg').src = CONFIG.photos.footer;
    $('footerMono').textContent = `${first.toUpperCase()} ♥ ${second.toUpperCase()} · 02–03.01.2027`;
  }

  /* ===== 3. CALENDAR (JAN 2027 — DAY 02 PRIMARY HEART + DAY 03 CEREMONY HEART) ===== */
  function renderCalendar() {
    const el = $('calendarDays');
    if (!el) return;
    el.innerHTML = '';
    // Jan 1, 2027 is Friday -> 4 empty Mon..Thu cells
    for (let i = 0; i < 4; i++) el.appendChild(document.createElement('div'));
    for (let d = 1; d <= 31; d++) {
      const cell = document.createElement('div');
      if (d === 2 || d === 3) {
        const isPrimary = d === 2;
        cell.className = 'cal-heart-cell';
        cell.innerHTML = `
          <svg class="cal-heart-svg ${isPrimary ? '' : 'secondary'}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path class="cal-heart-path"
              d="M18 31 C18 31 5 22.8 5 13.5 C5 8.8 8.6 5.5 12.8 5.5 C15.4 5.5 17.2 7 18 8.6 C18.8 7 20.6 5.5 23.2 5.5 C27.4 5.5 31 8.8 31 13.5 C31 22.8 18 31 18 31 Z"
              fill="#A81D24" fill-opacity="${isPrimary ? '0.16' : '0.07'}" stroke="currentColor" stroke-width="${isPrimary ? '1.9' : '1.4'}"/>
          </svg>
          <span class="cal-heart-num">${d}</span>`;
      } else {
        const isSun = (d + 4) % 7 === 0;
        cell.className = 'cal-day' + (isSun ? ' sun' : '');
        cell.textContent = d;
      }
      el.appendChild(cell);
    }
  }

  /* ===== 4. COUNTDOWN TO 16:30 ON 02/01/2027 ===== */
  function updateCountdown() {
    const target = new Date(cfg.countdownTarget).getTime();
    const diff = Math.max(0, target - Date.now());
    $('cdDays').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
    $('cdHours').textContent = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0');
    $('cdMins').textContent = String(Math.floor((diff / 60000) % 60)).padStart(2, '0');
    $('cdSecs').textContent = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  }

  /* ===== 5. SCROLL REVEAL OBSERVER ===== */
  function initScrollReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -28px 0px' }
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ===== 6. BACKGROUND WEDDING MUSIC ("BEAUTIFUL IN WHITE") ===== */
  const bgMusic = $('bgMusic');
  const musicBtn = $('musicToggleBtn');
  const MUSIC_TARGET_VOL = 0.65;
  let musicUserPaused = false;
  let musicResumeOnVisible = false;
  let musicFadeRaf = null;

  function syncMusicUI(playing) {
    if (!musicBtn) return;
    musicBtn.classList.toggle('is-playing', playing);
    musicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', playing ? 'Tắt nhạc nền Beautiful in White' : 'Bật nhạc nền Beautiful in White');
  }

  function cancelMusicFade() {
    if (musicFadeRaf) {
      cancelAnimationFrame(musicFadeRaf);
      musicFadeRaf = null;
    }
  }

  function fadeVolumeTo(target, durationMs, onDone) {
    cancelMusicFade();
    const startVol = bgMusic.volume;
    const startTime = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - startTime) / Math.max(1, durationMs));
      const eased = 1 - Math.pow(1 - p, 2);
      try { bgMusic.volume = Math.max(0, Math.min(1, startVol + (target - startVol) * eased)); } catch (_) {}
      if (p < 1) {
        musicFadeRaf = requestAnimationFrame(step);
      } else {
        musicFadeRaf = null;
        if (onDone) onDone();
      }
    };
    musicFadeRaf = requestAnimationFrame(step);
  }

  function startMusicWithFade(durationMs = 2400) {
    if (!bgMusic) return;
    cancelMusicFade();
    if (bgMusic.paused) {
      try { bgMusic.volume = 0.02; } catch (_) {}
    }
    const playPromise = bgMusic.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => {
        syncMusicUI(true);
        fadeVolumeTo(MUSIC_TARGET_VOL, durationMs);
      }).catch(() => syncMusicUI(false));
    } else {
      syncMusicUI(true);
      fadeVolumeTo(MUSIC_TARGET_VOL, durationMs);
    }
  }

  function stopMusic(smooth = true) {
    if (!bgMusic) return;
    cancelMusicFade();
    if (bgMusic.paused) {
      syncMusicUI(false);
      return;
    }
    if (smooth) {
      fadeVolumeTo(0, 260, () => {
        bgMusic.pause();
        syncMusicUI(false);
      });
    } else {
      bgMusic.pause();
      syncMusicUI(false);
    }
  }

  if (bgMusic && musicBtn) {
    bgMusic.addEventListener('play', () => syncMusicUI(true));
    bgMusic.addEventListener('pause', () => syncMusicUI(false));

    musicBtn.addEventListener('click', () => {
      if (bgMusic.paused) {
        musicUserPaused = false;
        startMusicWithFade(1100);
        showToast('Đang phát: Beautiful in White 🎵');
      } else {
        musicUserPaused = true;
        musicResumeOnVisible = false;
        stopMusic(true);
        showToast('Đã tạm dừng nhạc nền 🔇');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!bgMusic.paused) {
          musicResumeOnVisible = true;
          stopMusic(false);
        }
      } else if (musicResumeOnVisible && !musicUserPaused) {
        musicResumeOnVisible = false;
        startMusicWithFade(1000);
      }
    });

    window.addEventListener('pagehide', () => {
      if (!bgMusic.paused) {
        musicResumeOnVisible = true;
        stopMusic(false);
      }
    });
  }

  /* ===== 7. ENVELOPE CURTAIN OPEN + HERO CHOREOGRAPHY ===== */
  function openEnvelope(e) {
    const overlay = $('envelopeOverlay');
    if (!overlay || overlay.classList.contains('opened')) return;
    overlay.classList.add('opened');
    if (e && e.clientX) {
      spawnBurstHearts(e.clientX, e.clientY, 16);
    } else {
      spawnBurstHearts(window.innerWidth / 2, window.innerHeight / 2, 16);
    }
    setTimeout(() => document.body.classList.add('hero-ready'), 240);
    if (!musicUserPaused) startMusicWithFade(2400);
  }

  $('btnOpenEnv')?.addEventListener('click', openEnvelope);
  $('btnWaxSeal')?.addEventListener('click', openEnvelope);

  /* ===== 8. GIFT QR MODAL ===== */
  const modal = $('giftQrModal');

  function setQrTab(tab) {
    document.querySelectorAll('.qr-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.qrTab === tab);
    });
    $('groomQrCard').classList.toggle('hidden', tab === 'bride');
    $('brideQrCard').classList.toggle('hidden', tab === 'groom');
    $('qrGrid').classList.toggle('two-cols', tab === 'both');
  }

  function openGiftModal(tab = 'both') {
    setQrTab(tab);
    modal.classList.remove('hidden');
  }

  document.querySelectorAll('.btn-open-gift').forEach((btn) => {
    btn.addEventListener('click', () => openGiftModal(btn.dataset.qrOpen || 'both'));
  });
  $('btnCloseGift')?.addEventListener('click', () => modal.classList.add('hidden'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
  document.querySelectorAll('.qr-tab').forEach((btn) => {
    btn.addEventListener('click', () => setQrTab(btn.dataset.qrTab));
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

  /* ===== 9. LIGHTBOX GALLERY (SWIPE + KEYBOARD) ===== */
  const lb = $('photoLightbox');
  const lbImg = $('lightboxImg');

  function openLb(idx, customSrc) {
    if (customSrc) {
      lbImg.src = customSrc;
      $('lbCounter').textContent = 'Ảnh cưới Văn Nam & Kim Tiến';
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

  $('heroTriptych')?.addEventListener('click', () => openLb(0, CONFIG.photos.hero));
  $('duoLeftFrame')?.addEventListener('click', () => openLb(0, $('duoLeftImg').src));
  $('duoRightFrame')?.addEventListener('click', () => openLb(0, $('duoRightImg').src));
  $('threeStrip')?.addEventListener('click', (e) => {
    const img = e.target.closest('.strip-tile')?.querySelector('img');
    if (img) openLb(0, img.src);
  });
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
      modal?.classList.add('hidden');
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

  /* ===== 10. RSVP & GUESTBOOK ===== */
  $('floatRsvpBtn')?.addEventListener('click', () => {
    $('secRsvp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('.att-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      rsvpStatus = btn.dataset.att;
      document.querySelectorAll('.att-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.att === rsvpStatus);
      });
    });
  });

  function appendWish(name, meta, wish) {
    const div = document.createElement('div');
    div.className = 'wish-item';
    div.innerHTML = '<div class="wish-top"><span class="wish-author"></span><span class="wish-badge"></span></div><p class="wish-msg"></p>';
    div.querySelector('.wish-author').textContent = name;
    div.querySelector('.wish-badge').textContent = meta;
    div.querySelector('.wish-msg').textContent = wish;
    $('wishesList')?.prepend(div);
  }

  $('rsvpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('rsvpName').value.trim();
    if (!name) return;
    const relation = ($('rsvpRelation')?.value || '').trim();
    const count = $('rsvpCount').value;
    const wish = $('rsvpWish').value.trim() || 'Chúc Văn Nam & Kim Tiến trăm năm hạnh phúc!';
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
            relation,
            status: rsvpStatus,
            count,
            wish
          })
        });
      } catch (_) {}
      submitBtn.disabled = false;
      submitBtn.textContent = 'Gửi Xác Nhận';
    }

    const authorLabel = relation ? `${name} (${relation})` : name;
    appendWish(authorLabel, `${rsvpStatus} • ${count}`, wish);
    $('rsvpForm').reset();

    const rect = submitBtn.getBoundingClientRect();
    spawnBurstHearts(rect.left + rect.width / 2, rect.top, 14);
    showToast('Cảm ơn bạn đã xác nhận & gửi lời chúc! ❤️');
  });

  /* ===== INIT ===== */
  hydrateInvitation();
  initFallingHearts();
  initScrollReveal();
  setInterval(updateCountdown, 1000);
})();
