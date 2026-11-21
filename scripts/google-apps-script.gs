/**
 * GOOGLE APPS SCRIPT WEB APP — DATABASE KHÁCH MỜI THIỆP CƯỚI VĂN NAM & KIM TIẾN
 * Spreadsheet: Quản Lý Khách Mời Thiệp Cưới — Văn Nam & Kim Tiến
 * ID: 1TAM_jS1z_ugR0zEztDiA2hwzTsZK034Fkw1nUW6jzvY
 *
 * HƯỚNG DẪN TRIỂN KHAI (1 LẦN DUY NHẤT - 30 GIÂY):
 * 1. Mở Google Sheet -> Tiện ích mở rộng (Extensions) -> Apps Script
 * 2. Xóa toàn bộ mã cũ, dán toàn bộ file này vào và bấm Lưu (Ctrl+S)
 * 3. Bấm Triển khai (Deploy) -> Tùy chọn triển khai mới (New deployment)
 *    - Loại (Type): Ứng dụng web (Web app)
 *    - Thực thi với tư cách (Execute as): Tôi (Me)
 *    - Người có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 4. Bấm Triển khai -> Cấp quyền -> Copy URL (https://script.google.com/macros/s/.../exec)
 *    rồi dán vào mục "Kết nối Google Sheet" trên trang https://thiepcuoi-vannam-kimtien.com/quan-ly/
 */

var SHEET_ID = '1TAM_jS1z_ugR0zEztDiA2hwzTsZK034Fkw1nUW6jzvY';
var TAB_GUESTS = 'KhachMoi';
var HEADERS = [
  'ID', 'PhanLoai', 'Nha', 'TenKhach', 'LinkThiep',
  'DaXem', 'SoLanMo', 'LanMoCuoi', 'TrangThaiRSVP',
  'SoNguoi', 'LoiChuc', 'NguonLink', 'CapNhatCuoi'
];

function getGuestSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB_GUESTS);
  if (!sh) {
    sh = ss.insertSheet(TAB_GUESTS);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function nowVn_() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
}

function normVi_(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function normalizeSide_(raw, mode) {
  var s = normVi_(raw);
  if (s.indexOf('trai') !== -1 || s === 'groom' || s === 'nha-trai') return 'Nhà Trai';
  if (s.indexOf('gai') !== -1 || s === 'bride' || s === 'nha-gai') return 'Nhà Gái';
  if (s.indexOf('chung') !== -1 || s === 'both') return 'Bản chung';
  if (mode === 'nha-trai') return 'Nhà Trai';
  if (mode === 'nha-gai') return 'Nhà Gái';
  return 'Bản chung';
}

function parseHeadcount_(str) {
  var s = String(str || '');
  if (s.indexOf('3') !== -1 || s.indexOf('4') !== -1) return 4;
  var m = /(\d+)/.exec(s);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readAllRows_(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (!r[0] && !r[3]) continue;
    out.push({
      rowIndex: i + 2,
      id: String(r[0] || ''),
      type: String(r[1] || 'Vãng lai'),
      side: String(r[2] || 'Bản chung'),
      name: String(r[3] || ''),
      link: String(r[4] || ''),
      viewed: String(r[5] || 'Chưa xem'),
      openCount: Number(r[6]) || 0,
      lastOpen: String(r[7] || ''),
      rsvpStatus: String(r[8] || 'Chưa phản hồi'),
      guestCount: String(r[9] || ''),
      wish: String(r[10] || ''),
      sourceMode: String(r[11] || ''),
      updatedAt: String(r[12] || '')
    });
  }
  return out;
}

function rowObjToArray_(o) {
  return [
    o.id, o.type, o.side, o.name, o.link,
    o.viewed, o.openCount, o.lastOpen, o.rsvpStatus,
    o.guestCount, o.wish, o.sourceMode, o.updatedAt
  ];
}

function findMatchingRow_(rows, id, name, side, type) {
  if (id) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) return rows[i];
    }
  }
  var nName = normVi_(name);
  if (nName && type === 'Link riêng') {
    for (var j = 0; j < rows.length; j++) {
      if (
        rows[j].type === 'Link riêng' &&
        normVi_(rows[j].name) === nName &&
        (!side || rows[j].side === side)
      ) {
        return rows[j];
      }
    }
  }
  return null;
}

function handleWriteAction_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    var sh = getGuestSheet_();
    var rows = readAllRows_(sh);
    var action = String(payload.action || '');
    var ts = nowVn_();

    if (action === 'register_guest') {
      var name = String(payload.name || '').trim();
      if (!name) return { ok: false, error: 'Thiếu tên khách mời' };
      var side = normalizeSide_(payload.side, payload.sourceMode);
      var id = String(payload.id || ('K-' + Date.now()));
      var link = String(payload.link || '');
      var sourceMode = String(payload.sourceMode || (side === 'Nhà Trai' ? 'nha-trai' : (side === 'Nhà Gái' ? 'nha-gai' : 'both')));

      var existing = findMatchingRow_(rows, id, name, side, 'Link riêng');
      if (existing) {
        existing.link = link || existing.link;
        existing.sourceMode = sourceMode || existing.sourceMode;
        existing.updatedAt = ts;
        sh.getRange(existing.rowIndex, 1, 1, HEADERS.length).setValues([rowObjToArray_(existing)]);
        return { ok: true, id: existing.id, created: false };
      }

      var newRow = {
        id: id,
        type: 'Link riêng',
        side: side,
        name: name,
        link: link,
        viewed: 'Chưa xem',
        openCount: 0,
        lastOpen: '',
        rsvpStatus: 'Chưa phản hồi',
        guestCount: '',
        wish: '',
        sourceMode: sourceMode,
        updatedAt: ts
      };
      sh.appendRow(rowObjToArray_(newRow));
      return { ok: true, id: id, created: true };
    }

    if (action === 'track_open') {
      var isNamed = Boolean(payload.isNamed);
      var mode = String(payload.sourceMode || 'both');
      var sideOpen = normalizeSide_(payload.side, mode);
      var openName = String(payload.name || '').trim();
      var openId = String(payload.id || '').trim();
      var openLink = String(payload.link || '');
      var guestType = isNamed ? 'Link riêng' : 'Vãng lai';

      var match = findMatchingRow_(rows, openId, openName, sideOpen, guestType);
      if (match) {
        match.viewed = 'Đã xem';
        match.openCount = (Number(match.openCount) || 0) + 1;
        match.lastOpen = ts;
        match.updatedAt = ts;
        if (openLink && !match.link) match.link = openLink;
        if (mode) match.sourceMode = mode;
        if (isNamed && openName && match.name.indexOf('Khách vãng lai') === 0) {
          match.name = openName;
          match.type = 'Link riêng';
        }
        sh.getRange(match.rowIndex, 1, 1, HEADERS.length).setValues([rowObjToArray_(match)]);
        return { ok: true, id: match.id, openCount: match.openCount };
      }

      var createdId = openId || ((isNamed ? 'K-' : 'V-') + Date.now());
      var insertRow = {
        id: createdId,
        type: guestType,
        side: sideOpen,
        name: openName || 'Khách vãng lai (chưa nhập tên)',
        link: openLink,
        viewed: 'Đã xem',
        openCount: 1,
        lastOpen: ts,
        rsvpStatus: 'Chưa phản hồi',
        guestCount: '',
        wish: '',
        sourceMode: mode,
        updatedAt: ts
      };
      sh.appendRow(rowObjToArray_(insertRow));
      return { ok: true, id: createdId, openCount: 1 };
    }

    if (action === 'submit_rsvp') {
      var rName = String(payload.name || '').trim();
      if (!rName) return { ok: false, error: 'Thiếu tên khách mời' };
      var rMode = String(payload.sourceMode || 'both');
      var rSide = normalizeSide_(payload.side, rMode);
      var rIsNamed = Boolean(payload.isNamed);
      var rId = String(payload.id || '').trim();
      var rStatus = String(payload.status || 'Sẽ tham dự');
      var rCount = String(payload.count || '1 người');
      var rWish = String(payload.wish || '').trim();
      var rLink = String(payload.link || '');

      var target = findMatchingRow_(rows, rId, rName, rSide, rIsNamed ? 'Link riêng' : 'Vãng lai');
      if (target) {
        if (target.type === 'Vãng lai' || !target.name || target.name.indexOf('Khách vãng lai') === 0) {
          target.name = rName;
        }
        if (rSide !== 'Bản chung' || target.side === 'Bản chung') {
          target.side = rSide;
        }
        target.viewed = 'Đã xem';
        target.openCount = Math.max(1, Number(target.openCount) || 0);
        if (!target.lastOpen) target.lastOpen = ts;
        target.rsvpStatus = rStatus;
        target.guestCount = rCount;
        target.wish = rWish;
        target.sourceMode = rMode || target.sourceMode;
        target.updatedAt = ts;
        sh.getRange(target.rowIndex, 1, 1, HEADERS.length).setValues([rowObjToArray_(target)]);
        return { ok: true, id: target.id, updated: true };
      }

      var newRsvpId = rId || ((rIsNamed ? 'K-' : 'V-') + Date.now());
      var rsvpRow = {
        id: newRsvpId,
        type: rIsNamed ? 'Link riêng' : 'Vãng lai',
        side: rSide,
        name: rName,
        link: rLink,
        viewed: 'Đã xem',
        openCount: 1,
        lastOpen: ts,
        rsvpStatus: rStatus,
        guestCount: rCount,
        wish: rWish,
        sourceMode: rMode,
        updatedAt: ts
      };
      sh.appendRow(rowObjToArray_(rsvpRow));
      return { ok: true, id: newRsvpId, updated: false };
    }

    return { ok: false, error: 'Action không hợp lệ: ' + action };
  } finally {
    lock.releaseLock();
  }
}

function handleListGuests_(params) {
  var sh = getGuestSheet_();
  var allRows = readAllRows_(sh).reverse(); // Mới nhất lên đầu

  var stats = {
    total: allRows.length,
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

  for (var i = 0; i < allRows.length; i++) {
    var r = allRows[i];
    if (r.side === 'Nhà Trai') stats.groom++;
    else if (r.side === 'Nhà Gái') stats.bride++;
    else stats.both++;

    if (r.type === 'Link riêng') stats.named++;
    else stats.walkin++;

    if (r.viewed === 'Đã xem') stats.viewed++;
    else stats.unviewed++;

    if (r.rsvpStatus === 'Sẽ tham dự') {
      stats.attending++;
      stats.estPeople += parseHeadcount_(r.guestCount);
    } else if (r.rsvpStatus === 'Rất tiếc bận') {
      stats.declined++;
    } else {
      stats.pending++;
    }
  }

  var sideFilter = String(params.side || 'all');
  var typeFilter = String(params.type || 'all');
  var rsvpFilter = String(params.rsvp || 'all');
  var viewedFilter = String(params.viewed || 'all');
  var q = normVi_(params.q || '');

  var filtered = allRows.filter(function(item) {
    if (sideFilter === 'groom' && item.side !== 'Nhà Trai') return false;
    if (sideFilter === 'bride' && item.side !== 'Nhà Gái') return false;
    if (sideFilter === 'both' && item.side !== 'Bản chung') return false;

    if (typeFilter === 'named' && item.type !== 'Link riêng') return false;
    if (typeFilter === 'walkin' && item.type !== 'Vãng lai') return false;

    if (viewedFilter === 'yes' && item.viewed !== 'Đã xem') return false;
    if (viewedFilter === 'no' && item.viewed !== 'Chưa xem') return false;

    if (rsvpFilter === 'attending' && item.rsvpStatus !== 'Sẽ tham dự') return false;
    if (rsvpFilter === 'declined' && item.rsvpStatus !== 'Rất tiếc bận') return false;
    if (rsvpFilter === 'pending' && item.rsvpStatus !== 'Chưa phản hồi') return false;

    if (q) {
      var hay = normVi_(item.name + ' ' + item.wish + ' ' + item.side + ' ' + item.id);
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  var pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize, 10) || 10));
  var totalFiltered = filtered.length;
  var totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  var page = Math.max(1, Math.min(totalPages, parseInt(params.page, 10) || 1));
  var start = (page - 1) * pageSize;
  var items = filtered.slice(start, start + pageSize);

  return {
    ok: true,
    stats: stats,
    page: page,
    pageSize: pageSize,
    totalFiltered: totalFiltered,
    totalPages: totalPages,
    items: items
  };
}

function handleListWishes_() {
  var sh = getGuestSheet_();
  var rows = readAllRows_(sh).reverse();
  var wishes = [];
  for (var i = 0; i < rows.length && wishes.length < 20; i++) {
    var r = rows[i];
    if (r.wish && r.name && r.name.indexOf('Khách vãng lai') !== 0) {
      wishes.push({
        name: r.name,
        tag: r.rsvpStatus + (r.guestCount ? ' · ' + r.guestCount : ''),
        wish: r.wish
      });
    }
  }
  return { ok: true, wishes: wishes };
}

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || 'ping');

    if (action === 'ping') {
      var sh = getGuestSheet_();
      return jsonOut_({
        ok: true,
        sheetTitle: sh.getParent().getName(),
        rowCount: Math.max(0, sh.getLastRow() - 1)
      });
    }
    if (action === 'list_guests') {
      return jsonOut_(handleListGuests_(params));
    }
    if (action === 'list_wishes') {
      return jsonOut_(handleListWishes_());
    }
    if (action === 'track_open' || action === 'register_guest' || action === 'submit_rsvp') {
      return jsonOut_(handleWriteAction_(params));
    }
    return jsonOut_({ ok: false, error: 'Action không được hỗ trợ: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);
    return jsonOut_(handleWriteAction_(payload));
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
