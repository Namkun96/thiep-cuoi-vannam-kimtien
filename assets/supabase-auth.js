/* ==========================================================================
   WEDDING SUPABASE AUTH & RBAC CLIENT (Zero-Dependency REST/Auth Wrapper)
   - Authenticates Admin / Groom / Bride via Supabase Auth (GoTrue)
   - Manages user_profiles (role: admin | groom | bride, is_active)
   - Stores & retrieves protected app_settings (e.g. github_token) under RLS
     so Groom & Bride can publish changes without ever seeing any token.
   ========================================================================== */

(() => {
  'use strict';

  const SESSION_KEY = 'thiep_cuoi_sb_session_v1';

  function cleanUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function isConfigured(cfg) {
    return Boolean(cleanUrl(cfg?.supabaseUrl) && String(cfg?.supabaseAnonKey || '').trim());
  }

  function getStoredSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && obj.access_token ? obj : null;
    } catch (_) {
      return null;
    }
  }

  function saveSession(session) {
    try {
      if (!session) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      const expiresAt = session.expires_at
        ? Number(session.expires_at)
        : Math.floor(Date.now() / 1000) + (Number(session.expires_in) || 3600);
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: expiresAt,
        user: session.user || null
      }));
    } catch (_) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function parseError(data, status) {
    const raw = data?.error_description || data?.msg || data?.message || data?.error || `HTTP ${status}`;
    if (/Invalid login credentials/i.test(raw)) return 'Sai email hoặc mật khẩu. Vui lòng kiểm tra lại!';
    if (/Email not confirmed/i.test(raw)) return 'Tài khoản chưa xác nhận email. Trong Supabase -> Authentication -> Providers -> Email, hãy tắt "Confirm email" để đăng nhập ngay.';
    if (/User already registered/i.test(raw)) return 'Email này đã được đăng ký tài khoản rồi!';
    if (/Password should be at least/i.test(raw)) return 'Mật khẩu cần tối thiểu 6 ký tự!';
    if (/Unable to validate email/i.test(raw)) return 'Định dạng email không hợp lệ!';
    if (/relation .* does not exist|Could not find the table/i.test(raw)) {
      return 'Chưa chạy mã SQL khởi tạo bảng trên Supabase (SQL Editor). Hãy copy mã SQL và chạy trước!';
    }
    return raw;
  }

  async function sbFetch(baseUrl, anonKey, path, opts = {}) {
    const url = `${cleanUrl(baseUrl)}${path}`;
    const headers = {
      apikey: String(anonKey || '').trim(),
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    };
    if (opts.accessToken) {
      headers.Authorization = `Bearer ${opts.accessToken}`;
    } else if (!headers.Authorization) {
      headers.Authorization = `Bearer ${String(anonKey || '').trim()}`;
    }

    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { message: text }; }

    if (!res.ok) {
      const err = new Error(parseError(data, res.status));
      err.status = res.status;
      err.raw = data;
      throw err;
    }
    return data;
  }

  async function testConnection(url, anonKey) {
    const u = cleanUrl(url);
    const k = String(anonKey || '').trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(u) && !/^https?:\/\/.+/i.test(u)) {
      throw new Error('Supabase Project URL không hợp lệ (VD: https://xxxxx.supabase.co)');
    }
    if (!k) throw new Error('Vui lòng dán Supabase Anon / Publishable Key');
    // Verify table user_profiles exists & key is accepted
    await sbFetch(u, k, '/rest/v1/user_profiles?select=id&limit=1', { method: 'GET' });
    return true;
  }

  async function hasAnyAdmin(cfg) {
    try {
      const res = await sbFetch(cfg.supabaseUrl, cfg.supabaseAnonKey, '/rest/v1/rpc/has_any_wedding_admin', {
        method: 'POST',
        body: {}
      });
      return Boolean(res);
    } catch (_) {
      return true;
    }
  }

  async function signIn(cfg, email, password) {
    const data = await sbFetch(cfg.supabaseUrl, cfg.supabaseAnonKey, '/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: String(email || '').trim().toLowerCase(), password: String(password || '') }
    });
    saveSession(data);
    return getStoredSession();
  }

  async function refreshSession(cfg, refreshToken) {
    if (!refreshToken) return null;
    try {
      const data = await sbFetch(cfg.supabaseUrl, cfg.supabaseAnonKey, '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: refreshToken }
      });
      saveSession(data);
      return getStoredSession();
    } catch (_) {
      clearSession();
      return null;
    }
  }

  async function ensureValidSession(cfg) {
    const sess = getStoredSession();
    if (!sess) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (sess.expires_at && sess.expires_at - nowSec < 90 && sess.refresh_token) {
      return refreshSession(cfg, sess.refresh_token);
    }
    return sess;
  }

  async function signOut(cfg, session) {
    try {
      if (session?.access_token && isConfigured(cfg)) {
        await sbFetch(cfg.supabaseUrl, cfg.supabaseAnonKey, '/auth/v1/logout', {
          method: 'POST',
          accessToken: session.access_token
        });
      }
    } catch (_) {}
    clearSession();
  }

  // Stateless signup — does NOT overwrite the current Admin session in localStorage!
  async function signUpStateless(cfg, { email, password, fullName, role }) {
    const data = await sbFetch(cfg.supabaseUrl, cfg.supabaseAnonKey, '/auth/v1/signup', {
      method: 'POST',
      body: {
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
        data: {
          full_name: String(fullName || '').trim(),
          role: role || 'groom'
        }
      }
    });
    return data;
  }

  async function getCurrentProfile(cfg, session) {
    if (!session?.access_token) return null;
    let uid = session.user?.id;
    if (!uid) {
      const userObj = await sbFetch(cfg.supabaseUrl, cfg.supabaseAnonKey, '/auth/v1/user', {
        method: 'GET',
        accessToken: session.access_token
      });
      uid = userObj?.id;
      if (userObj) {
        session.user = userObj;
        saveSession(session);
      }
    }
    if (!uid) return null;
    const rows = await sbFetch(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      `/rest/v1/user_profiles?id=eq.${encodeURIComponent(uid)}&select=*`,
      { method: 'GET', accessToken: session.access_token }
    );
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function listUsers(cfg, session) {
    const rows = await sbFetch(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      '/rest/v1/user_profiles?select=*&order=created_at.asc',
      { method: 'GET', accessToken: session.access_token }
    );
    return Array.isArray(rows) ? rows : [];
  }

  async function updateUserProfile(cfg, session, userId, patch) {
    const body = { ...patch, updated_at: new Date().toISOString() };
    const rows = await sbFetch(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      `/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: 'PATCH',
        accessToken: session.access_token,
        headers: { Prefer: 'return=representation' },
        body
      }
    );
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function deleteUserProfile(cfg, session, userId) {
    await sbFetch(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      `/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', accessToken: session.access_token }
    );
    return true;
  }

  async function getAppSettings(cfg, session) {
    if (!session?.access_token) return {};
    try {
      const rows = await sbFetch(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey,
        '/rest/v1/app_settings?select=key,value',
        { method: 'GET', accessToken: session.access_token }
      );
      const map = {};
      if (Array.isArray(rows)) {
        rows.forEach((r) => { map[r.key] = r.value; });
      }
      return map;
    } catch (_) {
      return {};
    }
  }

  async function setAppSetting(cfg, session, key, value) {
    if (!session?.access_token) return false;
    await sbFetch(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      '/rest/v1/app_settings?on_conflict=key',
      {
        method: 'POST',
        accessToken: session.access_token,
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: { key, value: String(value || ''), updated_at: new Date().toISOString() }
      }
    );
    return true;
  }

  window.WeddingSupabase = {
    cleanUrl,
    isConfigured,
    getStoredSession,
    saveSession,
    clearSession,
    testConnection,
    hasAnyAdmin,
    signIn,
    refreshSession,
    ensureValidSession,
    signOut,
    signUpStateless,
    getCurrentProfile,
    listUsers,
    updateUserProfile,
    deleteUserProfile,
    getAppSettings,
    setAppSetting
  };
})();
