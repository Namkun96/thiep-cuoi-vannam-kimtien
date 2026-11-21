/* ==========================================================================
   THIỆP CƯỚI VĂN NAM & KIM TIẾN — LUXURY INDOCHINE EDITORIAL ENGINE
   Supports 3 independent switcher-free URLs synced dynamically with /quan-ly/:
     - /           (mode="both"     — Đầy đủ Nhà Trai & Nhà Gái)
     - /nha-trai/  (mode="nha-trai" — Riêng Nhà Trai)
     - /nha-gai/   (mode="nha-gai"  — Riêng Nhà Gái)
   ========================================================================== */

(() => {
  'use strict';

  const WS = window.WeddingStore;
  const mode = document.body.dataset.mode || 'both';
  const base = document.body.dataset.base || '.';
  const RSVP_ENDPOINT = '';

  const ICONS = {
    camera: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h5l2.5-3.5h11L28 14h5a2.5 2.5 0 0 1 2.5 2.5v13A2.5 2.5 0 0 1 33 32H7a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 7 14Z"/><circle cx="20" cy="22.5" r="5.5"/><circle cx="30" cy="18" r="1" fill="currentColor"/></svg>`,
    rings: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="15.5" cy="23" r="8"/><circle cx="24.5" cy="23" r="8"/><path d="M15.5 11.5 13 8.5h5l-2.5 3Z"/><path d="M15.5 11.5v3.5"/></svg>`,
    feast: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M8 26h24"/><path d="M10 26a10 10 0 0 1 20 0"/><path d="M20 16v-2.5"/><circle cx="20" cy="12" r="1.5"/><path d="M6 29.5h28"/></svg>`,
    car: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M9 24h22l-2.5-7.5A2 2 0 0 0 26.6 15H13.4a2 2 0 0 0-1.9 1.5L9 24Z"/><path d="M7 24h26v4.5a1.5 1.5 0 0 1-1.5 1.5h-23A1.5 1.5 0 0 1 7 28.5V24Z"/><circle cx="13" cy="27" r="1.4"/><circle cx="27" cy="27" r="1.4"/><path d="M20 11.5c0 0 2.5-2.5 4.2-1 1.4 1.3 0 3.3-4.2 4.5-4.2-1.2-5.6-3.2-4.2-4.5 1.7-1.5 4.2 1 4.2 1Z"/></svg>`,
    music: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28V12l14-2.5V25"/><circle cx="13" cy="28" r="3"/><circle cx="27" cy="25" r="3"/><path d="M16 16.5 30 14"/></svg>`
  };

  const $ = (id) => document.getElementById(id);
  const escHtml = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const params = new URLSearchParams(window.location.search);
  const customGuest = (params.get('khach') || params.get('guest') || params.get('to') || '').trim();
  const gidParam = (params.get('gid') || '').trim();
  const isNamedGuest = Boolean(customGuest || gidParam);
  const guestDisplay = customGuest || 'Quý Khách & Gia Đình';

  function getOrCreateVisitorId() {
    const key = `thiep_cuoi_vid_${mode}_v1`;
    try {
      let v = localStorage.getItem(key);
      if (!v) {
        v = `V-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        localStorage.setItem(key, v);
      }
      return v;
    } catch (_) {
      return `V-${Date.now().toString(36)}`;
    }
  }

  const guestRecordId = isNamedGuest
    ? (gidParam || `K-${mode}-${customGuest.toLowerCase().replace(/[^a-z0-9\u00C0-\u1EF9]+/gi, '-').slice(0, 32)}`)
    : getOrCreateVisitorId();
  const modeSideLabel = mode === 'nha-trai' ? 'Nhà Trai' : (mode === 'nha-gai' ? 'Nhà Gái' : 'Bản chung');

  let activeData = WS.clone(WS.DEFAULT_CONFIG);
  let activeAlbumResolved = [];
  let countdownTargetIso = '2027-01-02T16:30:00+07:00';
  let lbIndex = 0;
  let revealIo = null;
  let visitTracked = false;

  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
  }

  function addHour(timeStr, deltaHours) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '16:30'));
    const h = m ? parseInt(m[1], 10) : 16;
    const mi = m ? parseInt(m[2], 10) : 30;
    const nh = (h + deltaHours + 24) % 24;
    return `${String(nh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  }

  function formatLunarPair(partyDate, ceremonyDate) {
    const lp = WS.solarToLunar(partyDate);
    if (!ceremonyDate || ceremonyDate === partyDate) {
      return `(Tức ${lp.text})`;
    }
    const lc = WS.solarToLunar(ceremonyDate);
    if (lp.month === lc.month && lp.year === lc.year) {
      return `(Tức ngày ${lp.dd} – ${lc.dd} tháng ${lp.mm}${lp.leap ? ' nhuận' : ''} năm ${lp.canChi})`;
    }
    return `(Tức ${lp.text})`;
  }

  function formatHeroRange(d1Str, d2Str) {
    const a = WS.parseDateParts(d1Str);
    const b = WS.parseDateParts(d2Str);
    if (d1Str === d2Str) return `${a.dd} . ${a.mm} . ${a.year}`;
    if (a.month === b.month && a.year === b.year) {
      return `${a.dd} – ${b.dd} . ${a.mm} . ${a.year}`;
    }
    return `${a.dd}.${a.mm} – ${b.dd}.${b.mm}.${b.year}`;
  }

  function buildViewModel(cfg) {
    const g = cfg.groom;
    const b = cfg.bride;

    const gParty = WS.parseDateParts(g.partyDate);
    const gCer = WS.parseDateParts(g.ceremonyDate);
    const bParty = WS.parseDateParts(b.partyDate);
    const bCer = WS.parseDateParts(b.ceremonyDate);

    const gFullAddr = WS.formatFullAddress(g);
    const bFullAddr = WS.formatFullAddress(b);

    const venues = {
      groom: {
        title: 'Tư Gia Nhà Trai',
        addr: gFullAddr,
        note: g.venueNote || '',
        mapUrl: WS.buildMapUrl(gFullAddr),
        embedUrl: WS.buildMapEmbedUrl(gFullAddr)
      },
      bride: {
        title: 'Tư Gia Nhà Gái',
        addr: bFullAddr,
        note: b.venueNote || '',
        mapUrl: WS.buildMapUrl(bFullAddr),
        embedUrl: WS.buildMapEmbedUrl(bFullAddr)
      }
    };

    if (mode === 'nha-trai') {
      return {
        isBrideFirst: false,
        showSideSelect: false,
        heroDateSub: `${g.partyTime} · ${gParty.dd} . ${gParty.mm} . ${gParty.year}`,
        footerDateSub: formatHeroRange(g.partyDate, g.ceremonyDate),
        countdownTarget: `${g.partyDate}T${g.partyTime}:00+07:00`,
        calMonthDate: g.partyDate,
        calSolidDate: g.partyDate,
        calOutlineDate: g.ceremonyDate,
        calNoteSolid: `♥ ${gParty.dd}/${gParty.mm} · Tiệc cưới (${g.partyTime})`,
        calNoteOutline: `♡ ${gCer.dd}/${gCer.mm} · Lễ Thành Hôn (${g.ceremonyTime})`,
        venueKeys: ['groom'],
        venues,
        events: [
          {
            tag: 'Tiệc Cưới Nhà Trai',
            timeVal: `${g.partyTime}, ${gParty.weekdayUpper}`,
            month: gParty.monthVi,
            day: gParty.dd,
            year: `NĂM ${gParty.year}`,
            lunar: `(Tức ${WS.solarToLunar(g.partyDate).text})`,
            subNote: 'Đón tiếp Quý khách, bạn bè & đồng nghiệp chung vui cùng gia đình'
          },
          {
            tag: 'Lễ Thành Hôn',
            timeVal: `${g.ceremonyTime}, ${gCer.weekdayUpper}`,
            month: gCer.monthVi,
            day: gCer.dd,
            year: `NĂM ${gCer.year}`,
            lunar: `(Tức ${WS.solarToLunar(g.ceremonyDate).text})`,
            subNote: `Cỗ sáng từ ${g.ceremonyTime} · Rước dâu & đón tân nương nhập gia`
          }
        ],
        timeline: [
          { time: `${g.partyTime} · ${gParty.dd}/${gParty.mm}`, label: 'Đón Khách & Check-in', sub: 'Đón tiếp bạn bè, đồng nghiệp tại Tư gia Nhà Trai', icon: 'camera' },
          { time: `${addHour(g.partyTime, 1)} · ${gParty.dd}/${gParty.mm}`, label: 'Khai Tiệc Thân Mật', sub: 'Nâng ly chúc mừng cùng gia đình Nhà Trai', icon: 'feast' },
          { time: `${addHour(g.partyTime, 3)} · ${gParty.dd}/${gParty.mm}`, label: 'Giao Lưu & Âm Nhạc', sub: 'Lưu giữ khoảnh khắc ấm áp bên người thương', icon: 'music' },
          { time: `${g.ceremonyTime} · ${gCer.dd}/${gCer.mm}`, label: 'Lễ Thành Hôn', sub: `Nghi lễ gia tiên & đón tân nương tại ${g.ward || g.detailAddress}`, icon: 'rings' }
        ]
      };
    }

    if (mode === 'nha-gai') {
      return {
        isBrideFirst: true,
        showSideSelect: false,
        heroDateSub: `${b.partyTime} · ${bParty.dd} . ${bParty.mm} . ${bParty.year}`,
        footerDateSub: formatHeroRange(b.partyDate, b.ceremonyDate),
        countdownTarget: `${b.partyDate}T${b.partyTime}:00+07:00`,
        calMonthDate: b.partyDate,
        calSolidDate: b.partyDate,
        calOutlineDate: b.ceremonyDate,
        calNoteSolid: `♥ ${bParty.dd}/${bParty.mm} · Tiệc cưới (${b.partyTime})`,
        calNoteOutline: `♡ ${bCer.dd}/${bCer.mm} · Lễ Vu Quy (${b.ceremonyTime})`,
        venueKeys: ['bride'],
        venues,
        events: [
          {
            tag: 'Tiệc Cưới Nhà Gái',
            timeVal: `${b.partyTime}, ${bParty.weekdayUpper}`,
            month: bParty.monthVi,
            day: bParty.dd,
            year: `NĂM ${bParty.year}`,
            lunar: `(Tức ${WS.solarToLunar(b.partyDate).text})`,
            subNote: 'Đón tiếp Quý khách, bạn bè & người thân chung vui cùng gia đình'
          },
          {
            tag: 'Lễ Vu Quy',
            timeVal: `${b.ceremonyTime}, ${bCer.weekdayUpper}`,
            month: bCer.monthVi,
            day: bCer.dd,
            year: `NĂM ${bCer.year}`,
            lunar: `(Tức ${WS.solarToLunar(b.ceremonyDate).text})`,
            subNote: `${b.ceremonyTime} Đón khách · Nghi lễ gia tiên & Lễ Đưa Dâu`
          }
        ],
        timeline: [
          { time: `${b.partyTime} · ${bParty.dd}/${bParty.mm}`, label: 'Đón Khách & Check-in', sub: 'Đón tiếp bạn bè & khách quý tại Tư gia Nhà Gái', icon: 'camera' },
          { time: `${addHour(b.partyTime, 1)} · ${bParty.dd}/${bParty.mm}`, label: 'Khai Tiệc Thân Mật', sub: `Chung vui cùng gia đình Nhà Gái tại ${b.ward || b.detailAddress}`, icon: 'feast' },
          { time: `${b.ceremonyTime} · ${bCer.dd}/${bCer.mm}`, label: 'Lễ Vu Quy & Xin Dâu', sub: 'Nghi lễ gia tiên trang trọng của gia đình Nhà Gái', icon: 'rings' },
          { time: `${addHour(b.ceremonyTime, 2)} · ${bCer.dd}/${bCer.mm}`, label: 'Lễ Đưa Dâu', sub: 'Đoàn xe hoa đưa tân nương về Nhà Trai', icon: 'car' }
        ]
      };
    }

    // Default: mode === 'both'
    const earliestParty = g.partyDate <= b.partyDate ? g : b;
    const ep = WS.parseDateParts(earliestParty.partyDate);
    const ec = WS.parseDateParts(g.ceremonyDate);
    return {
      isBrideFirst: false,
      showSideSelect: true,
      heroDateSub: formatHeroRange(g.partyDate, g.ceremonyDate),
      footerDateSub: formatHeroRange(g.partyDate, g.ceremonyDate),
      countdownTarget: `${earliestParty.partyDate}T${earliestParty.partyTime}:00+07:00`,
      calMonthDate: earliestParty.partyDate,
      calSolidDate: earliestParty.partyDate,
      calOutlineDate: g.ceremonyDate,
      calNoteSolid: `♥ ${ep.dd}/${ep.mm} · Tiệc cưới (${earliestParty.partyTime})`,
      calNoteOutline: `♡ ${ec.dd}/${ec.mm} · Lễ Thành Hôn & Vu Quy`,
      venueKeys: ['groom', 'bride'],
      venues,
      events: [
        {
          tag: 'Nhà Trai · Lễ Thành Hôn',
          timeVal: `${g.partyTime}, ${gParty.weekdayUpper} (TIỆC CƯỚI) · ${g.ceremonyTime}, ${gCer.weekdayUpper} (LỄ CHÍNH)`,
          month: gParty.monthVi,
          day: gParty.dd,
          year: `NĂM ${gParty.year}`,
          lunar: formatLunarPair(g.partyDate, g.ceremonyDate),
          subNote: `Tổ chức tại Tư gia Nhà Trai — ${[g.detailAddress, g.ward].filter(Boolean).join(', ')}`
        },
        {
          tag: 'Nhà Gái · Lễ Vu Quy',
          timeVal: `${b.partyTime}, ${bParty.weekdayUpper} (TIỆC CƯỚI) · ${b.ceremonyTime}, ${bCer.weekdayUpper} (LỄ CHÍNH)`,
          month: bParty.monthVi,
          day: bParty.dd,
          year: `NĂM ${bParty.year}`,
          lunar: formatLunarPair(b.partyDate, b.ceremonyDate),
          subNote: `Tổ chức tại Tư gia Nhà Gái — ${[b.detailAddress, b.ward].filter(Boolean).join(', ')}`
        }
      ],
      timeline: [
        { time: `${g.partyTime} · ${gParty.dd}/${gParty.mm}`, label: 'Đón Khách & Tiệc Cưới', sub: 'Khai tiệc thân mật tại Tư gia Nhà Trai & Nhà Gái', icon: 'feast' },
        { time: `${g.ceremonyTime} · ${gCer.dd}/${gCer.mm}`, label: 'Cỗ Sáng & Đón Khách', sub: 'Đón họ hàng, khách quý hai gia đình', icon: 'camera' },
        { time: `${b.ceremonyTime} · ${bCer.dd}/${bCer.mm}`, label: 'Lễ Vu Quy & Xin Dâu', sub: `Nghi lễ gia tiên tại ${[b.detailAddress, b.ward].filter(Boolean).join(', ')}`, icon: 'rings' },
        { time: `${addHour(b.ceremonyTime, 2)} · ${gCer.dd}/${gCer.mm}`, label: 'Lễ Thành Hôn', sub: `Đón tân nương nhập gia tại ${[g.detailAddress, g.ward].filter(Boolean).join(', ')}`, icon: 'car' }
      ]
    };
  }

  /* ===== 1. HYDRATE CONTENT FOR ACTIVE MODE & CONFIG ===== */
  function hydrate(data) {
    activeData = data;
    const vm = buildViewModel(data);
    countdownTargetIso = vm.countdownTarget;

    const first = vm.isBrideFirst ? data.brideName : data.groomName;
    const second = vm.isBrideFirst ? data.groomName : data.brideName;

    // Personalized browser tab title & guest lines across the whole invitation
    if (customGuest) {
      document.title = `Kính mời ${customGuest} — Thiệp Cưới ${first} & ${second}`;
    }

    // Door overlay
    $('doorCouple').innerHTML = `${escHtml(first)}<span class="door-amp">&amp;</span>${escHtml(second)}`;
    $('doorGuestLine').textContent = `Kính mời: ${guestDisplay}`;

    // Hero cover
    $('heroCoverImg').src = WS.resolveAsset(data.photos.hero, base);
    $('heroCoupleNames').innerHTML = `<span class="name-line">${escHtml(first)}</span><span class="amp">&amp;</span><span class="name-line">${escHtml(second)}</span>`;
    $('heroDateSub').textContent = vm.heroDateSub;

    // Self-opening envelope letter
    const letterKicker = $('letterKicker');
    if (letterKicker) {
      letterKicker.innerHTML = customGuest
        ? `Trân trọng kính mời <strong style="color:var(--burgundy);">${escHtml(customGuest)}</strong><br/>dự lễ cưới của`
        : `Trân trọng kính mời dự lễ cưới của<br/>You're invited to the wedding of`;
    }
    $('letterNames').innerHTML = `<span class="letter-line">${escHtml(first)}</span><span class="amp-small">&amp;</span><span class="letter-line">${escHtml(second)}</span>`;

    // Interlude photo
    $('interludeImg').src = WS.resolveAsset(data.photos.interlude, base);

    // Formal Two Families (Vietnamese etiquette ordering)
    const gShortHtml = WS.formatShortAddressHtml(data.groom);
    const bShortHtml = WS.formatShortAddressHtml(data.bride);

    if (!vm.isBrideFirst) {
      $('famLeftVi').textContent = 'Nhà Trai';
      $('famLeftEn').textContent = "Groom's Side";
      $('famLeftParent').textContent = data.groom.parent;
      $('famLeftAddr').innerHTML = gShortHtml;
      $('famRightVi').textContent = 'Nhà Gái';
      $('famRightEn').textContent = "Bride's Side";
      $('famRightParent').textContent = data.bride.parent;
      $('famRightAddr').innerHTML = bShortHtml;

      $('polaroid1Img').src = WS.resolveAsset(data.photos.polaroidGroom, base);
      $('polaroid1Role').textContent = 'The Groom';
      $('polaroid1Name').textContent = data.groomName;
      $('polaroid2Img').src = WS.resolveAsset(data.photos.polaroidBride, base);
      $('polaroid2Role').textContent = 'The Bride';
      $('polaroid2Name').textContent = data.brideName;
    } else {
      $('famLeftVi').textContent = 'Nhà Gái';
      $('famLeftEn').textContent = "Bride's Side";
      $('famLeftParent').textContent = data.bride.parent;
      $('famLeftAddr').innerHTML = bShortHtml;
      $('famRightVi').textContent = 'Nhà Trai';
      $('famRightEn').textContent = "Groom's Side";
      $('famRightParent').textContent = data.groom.parent;
      $('famRightAddr').innerHTML = gShortHtml;

      $('polaroid1Img').src = WS.resolveAsset(data.photos.polaroidBride, base);
      $('polaroid1Role').textContent = 'The Bride';
      $('polaroid1Name').textContent = data.brideName;
      $('polaroid2Img').src = WS.resolveAsset(data.photos.polaroidGroom, base);
      $('polaroid2Role').textContent = 'The Groom';
      $('polaroid2Name').textContent = data.groomName;
    }

    // Formal Guest & Couple names
    $('formalGuestName').textContent = guestDisplay;
    $('formalNameTop').textContent = first;
    $('formalNameBottom').textContent = second;

    // Personalized RSVP intro, pre-filled guest name, and Footer quote
    if (customGuest) {
      if ($('rsvpIntro')) {
        $('rsvpIntro').textContent = `Sự hiện diện của ${customGuest} là niềm vinh hạnh lớn lao của gia đình chúng mình. Xin vui lòng xác nhận tham dự để gia đình đón tiếp chu đáo nhất!`;
      }
      if ($('rsvpName') && !$('rsvpName').value) {
        $('rsvpName').value = customGuest;
      }
      if ($('footerQuote')) {
        $('footerQuote').innerHTML = `Cảm ơn <strong>${escHtml(customGuest)}</strong> đã đến dự và chia sẻ niềm vui cùng chúng mình.<br/>Sự có mặt của ${escHtml(customGuest)} là món quà ý nghĩa nhất.`;
      }
    }

    // Formal Event Time Blocks (clean date/time only, no duplicate map buttons)
    $('formalEventsList').innerHTML = vm.events.map((ev, idx) => `
      <div class="formal-event reveal" style="--d:${idx * 90}ms;">
        <p class="fe-tag">${escHtml(ev.tag)}</p>
        <p class="fe-time-lead">Được tổ chức vào lúc</p>
        <p class="fe-time-val lnum">${escHtml(ev.timeVal)}</p>
        <div class="fe-date-triad lnum">
          <span class="fe-side">${escHtml(ev.month)}</span>
          <span class="fe-day-big">${escHtml(ev.day)}</span>
          <span class="fe-side">${escHtml(ev.year)}</span>
        </div>
        <p class="fe-lunar">${escHtml(ev.lunar)}</p>
        ${ev.subNote ? `<p class="fe-sub-note">${escHtml(ev.subNote)}</p>` : ''}
      </div>
    `).join('');

    // Unified Location Map Thumbnail Cards (1 clean mini map preview + 1 button per house)
    const isMultiVenue = vm.venueKeys.length > 1;
    $('formalVenuesList').innerHTML = vm.venueKeys.map((key, idx) => {
      const v = vm.venues[key];
      const btnText = isMultiVenue
        ? (key === 'groom' ? 'Chỉ đường Nhà Trai' : 'Chỉ đường Nhà Gái')
        : 'Xem chỉ đường';
      return `
        <div class="venue-map-card reveal" style="--d:${idx * 100}ms;">
          <p class="fe-venue-kicker">Địa điểm tổ chức · Location</p>
          <p class="fe-venue-name">${escHtml(v.title)}</p>
          <p class="fe-venue-addr">${escHtml(v.addr)}</p>
          <a href="${escHtml(v.mapUrl)}" target="_blank" rel="noopener noreferrer" class="mini-map-thumb" aria-label="Mở bản đồ Google Maps tới ${escHtml(v.title)}">
            <iframe
              title="Bản đồ thu nhỏ ${escHtml(v.title)}"
              src="${escHtml(v.embedUrl)}"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              tabindex="-1"></iframe>
          </a>
          ${v.note ? `<p class="venue-map-note">${escHtml(v.note)}</p>` : ''}
          <a href="${escHtml(v.mapUrl)}" target="_blank" rel="noopener noreferrer" class="fe-map-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${escHtml(btnText)}</span>
          </a>
        </div>
      `;
    }).join('');

    // Polaroid story bg
    $('storyBgImg').src = WS.resolveAsset(data.photos.storyBg, base);

    // Vertical Timeline
    $('timelineAxis').innerHTML = vm.timeline.map((item, idx) => {
      const iconHtml = `<div class="tl-icon-wrap">${ICONS[item.icon] || ICONS.rings}</div>`;
      const textHtml = `
        <p class="tl-time-str lnum">${escHtml(item.time)}</p>
        <p class="tl-label-str">${escHtml(item.label)}</p>
        <p class="tl-sub-str">${escHtml(item.sub)}</p>
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

    // Vinyl label, Album & Footer
    $('vinylLabelImg').src = WS.resolveAsset(data.photos.vinylLabel, base);
    $('rsvpThanksPhoto').src = WS.resolveAsset(data.photos.rsvpThanks, base);
    $('footerBgImg').src = WS.resolveAsset(data.photos.footerBg, base);
    $('footerBrand').textContent = `${first.toUpperCase()} ♥ ${second.toUpperCase()}`;
    if ($('footerDate')) $('footerDate').textContent = vm.footerDateSub;

    activeAlbumResolved = data.photos.album.map((p) => WS.resolveAsset(p, base));
    document.querySelectorAll('[data-album-idx]').forEach((el) => {
      const i = parseInt(el.dataset.albumIdx, 10);
      const img = el.querySelector('img');
      if (img && activeAlbumResolved[i]) img.src = activeAlbumResolved[i];
    });

    // RSVP side dropdown only needed on dual-family root link
    if (!vm.showSideSelect && $('rsvpSide')) {
      $('rsvpSide').classList.add('hidden');
    }

    // Gift cards & QR ordering
    if (vm.isBrideFirst) {
      $('giftTileBride').style.order = '1';
      $('giftTileGroom').style.order = '2';
      $('brideQrCard').style.order = '1';
      $('groomQrCard').style.order = '2';
    }

    $('modalGroomName').textContent = data.groomName;
    $('modalBrideName').textContent = data.brideName;
    $('modalGroomBank').textContent = data.groom.bankName;
    $('modalGroomAcc').textContent = data.groom.bankAcc;
    $('modalGroomOwner').textContent = data.groom.bankOwner;
    $('modalBrideBank').textContent = data.bride.bankName;
    $('modalBrideAcc').textContent = data.bride.bankAcc;
    $('modalBrideOwner').textContent = data.bride.bankOwner;

    const gQr = WS.resolveAsset(data.groom.qrImage, base);
    if (gQr) {
      $('groomQrImg').src = gQr;
      $('groomQrImg').classList.remove('hidden');
      $('groomQrSvg').classList.add('hidden');
    } else {
      $('groomQrImg').classList.add('hidden');
      $('groomQrSvg').classList.remove('hidden');
    }

    const bQr = WS.resolveAsset(data.bride.qrImage, base);
    if (bQr) {
      $('brideQrImg').src = bQr;
      $('brideQrImg').classList.remove('hidden');
      $('brideQrSvg').classList.add('hidden');
    } else {
      $('brideQrImg').classList.add('hidden');
      $('brideQrSvg').classList.remove('hidden');
    }

    renderCalendar(vm);
    updateCountdown();
    observeReveals();
  }

  /* ===== 2. DYNAMIC MINIMALIST CALENDAR ===== */
  function renderCalendar(vm) {
    const grid = $('calendarDays');
    if (!grid) return;

    const baseDate = WS.parseDateParts(vm.calMonthDate);
    const solid = WS.parseDateParts(vm.calSolidDate);
    const outline = WS.parseDateParts(vm.calOutlineDate);

    if ($('calSubMonth')) {
      $('calSubMonth').textContent = `Tháng ${baseDate.mm} · ${baseDate.monthEn} ${baseDate.year}`;
    }
    if ($('calNotes')) {
      $('calNotes').innerHTML = `
        <span><strong style="color:var(--burgundy);">${escHtml(vm.calNoteSolid)}</strong></span>
        <span><strong style="color:var(--gold);">${escHtml(vm.calNoteOutline)}</strong></span>
      `;
    }

    grid.innerHTML = '';
    const firstWeekday = new Date(Date.UTC(baseDate.year, baseDate.month - 1, 1)).getUTCDay(); // 0=Sun..6=Sat
    const leadingBlanks = (firstWeekday + 6) % 7; // Mon=0..Sun=6
    const daysInMonth = new Date(Date.UTC(baseDate.year, baseDate.month, 0)).getUTCDate();

    for (let i = 0; i < leadingBlanks; i++) grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      const isSolid = solid.year === baseDate.year && solid.month === baseDate.month && solid.day === d;
      const isOutline = !isSolid && outline.year === baseDate.year && outline.month === baseDate.month && outline.day === d;

      if (isSolid) {
        cell.className = 'cal-heart-mark solid lnum';
        cell.innerHTML = `
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path d="M18 31 C18 31 5 22.8 5 13.5 C5 8.8 8.6 5.5 12.8 5.5 C15.4 5.5 17.2 7 18 8.6 C18.8 7 20.6 5.5 23.2 5.5 C27.4 5.5 31 8.8 31 13.5 C31 22.8 18 31 18 31 Z" fill="#6E0C17"/>
          </svg>
          <span>${d}</span>`;
      } else if (isOutline) {
        cell.className = 'cal-heart-mark outline lnum';
        cell.innerHTML = `
          <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M18 31 C18 31 5 22.8 5 13.5 C5 8.8 8.6 5.5 12.8 5.5 C15.4 5.5 17.2 7 18 8.6 C18.8 7 20.6 5.5 23.2 5.5 C27.4 5.5 31 8.8 31 13.5 C31 22.8 18 31 18 31 Z" fill="rgba(110,12,23,0.08)" stroke="#6E0C17" stroke-width="1.5"/>
          </svg>
          <span>${d}</span>`;
      } else {
        const isSun = (leadingBlanks + d) % 7 === 0;
        cell.className = 'cal-cell lnum' + (isSun ? ' sun' : '');
        cell.textContent = d;
      }
      grid.appendChild(cell);
    }
  }

  /* ===== 3. LIVE COUNTDOWN (INSIDE RISING ENVELOPE CARD) ===== */
  function updateCountdown() {
    const target = new Date(countdownTargetIso).getTime();
    const diff = Math.max(0, (Number.isFinite(target) ? target : Date.now()) - Date.now());
    $('cdDays').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
    $('cdHours').textContent = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0');
    $('cdMins').textContent = String(Math.floor((diff / 60000) % 60)).padStart(2, '0');
    $('cdSecs').textContent = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  }

  /* ===== 4. SCROLL REVEAL & SELF-OPENING ENVELOPE ===== */
  function observeReveals() {
    const reveals = document.querySelectorAll('.reveal:not(.in-view)');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('in-view'));
      return;
    }
    if (!revealIo) {
      revealIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              revealIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -20px 0px' }
      );
    }
    reveals.forEach((el) => revealIo.observe(el));
  }

  function initEnvelopeObserver() {
    const envScene = $('envScene');
    if (!envScene) return;
    if (!('IntersectionObserver' in window)) {
      envScene.classList.add('is-open');
      return;
    }
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
    navigator.clipboard?.writeText(String(activeData.groom.bankAcc || '').replace(/\s+/g, '')).then(() => showToast('Đã copy STK Chú Rể!'));
  });
  $('btnCopyBride')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(String(activeData.bride.bankAcc || '').replace(/\s+/g, '')).then(() => showToast('Đã copy STK Cô Dâu!'));
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
      $('lbCounter').textContent = `${activeData.groomName} & ${activeData.brideName}`;
      $('btnLbPrev').classList.add('hidden');
      $('btnLbNext').classList.add('hidden');
    } else {
      const list = activeAlbumResolved;
      if (!list.length) return;
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
    const showSide = mode === 'both';
    const rawSide = showSide ? $('rsvpSide').value : modeSideLabel;
    const side = rawSide.includes('Gái') ? 'Nhà Gái' : (rawSide.includes('Trai') ? 'Nhà Trai' : modeSideLabel);
    const wish = $('rsvpWish').value.trim() || `Chúc ${activeData.groomName} & ${activeData.brideName} trăm năm hạnh phúc!`;
    const submitBtn = $('rsvpSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';
    try {
      await WS.sheetPost(activeData.sheetApiUrl || RSVP_ENDPOINT, {
        action: 'submit_rsvp',
        id: guestRecordId,
        isNamed: isNamedGuest,
        name,
        side,
        status,
        count,
        wish,
        sourceMode: mode,
        link: window.location.href
      });
    } catch (_) {}
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send · Xác Nhận';

    appendWish(name, `${status} · ${count}`, wish);
    $('rsvpForm').reset();
    if (customGuest && $('rsvpName')) $('rsvpName').value = customGuest;
    thanksModal?.classList.remove('hidden');
  });

  function trackVisitAndSyncWishes(config) {
    if (visitTracked) return;
    visitTracked = true;

    WS.sheetPost(config.sheetApiUrl, {
      action: 'track_open',
      id: guestRecordId,
      isNamed: isNamedGuest,
      name: customGuest,
      side: modeSideLabel,
      sourceMode: mode,
      link: window.location.href
    });

    if (config.sheetApiUrl) {
      WS.listSheetWishes(config.sheetApiUrl).then((res) => {
        if (res && res.ok && Array.isArray(res.wishes) && res.wishes.length) {
          const listEl = $('wishesList');
          if (!listEl) return;
          listEl.innerHTML = '';
          res.wishes.slice().reverse().forEach((w) => appendWish(w.name, w.tag, w.wish));
        }
      }).catch(() => {});
    }
  }

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

  /* ===== INIT (SYNCHRONOUS DEFAULT RENDER + ASYNC DYNAMIC CONFIG SYNC) ===== */
  hydrate(WS.clone(WS.DEFAULT_CONFIG));
  initEnvelopeObserver();
  initBottomNav();
  setInterval(updateCountdown, 1000);

  WS.loadConfig(base).then(({ config }) => {
    hydrate(config);
    trackVisitAndSyncWishes(config);
  }).catch(() => {
    trackVisitAndSyncWishes(activeData);
  });
})();
