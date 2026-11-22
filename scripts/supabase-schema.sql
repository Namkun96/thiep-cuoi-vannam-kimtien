-- ============================================================================
-- SUPABASE SCHEMA — QUẢN LÝ USER & PHÂN QUYỀN THIỆP CƯỚI VĂN NAM & KIM TIẾN
-- 3 Vai trò (Roles):
--   - admin : Toàn quyền quản trị (thấy tất cả, cấu hình code/token/user)
--   - groom : Chú rể (chỉ thao tác & xem thiệp Nhà Trai + Bản chung)
--   - bride : Cô dâu (chỉ thao tác & xem thiệp Nhà Gái + Bản chung)
--
-- HƯỚNG DẪN CHẠY:
--   Mở Supabase Dashboard -> SQL Editor -> New query -> Dán toàn bộ -> Run
-- ============================================================================

-- 1. Bảng hồ sơ & vai trò người dùng
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'groom' CHECK (role IN ('admin', 'groom', 'bride')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Bảng cấu hình bảo mật (lưu GitHub Token để Chú rể & Cô dâu tự đồng bộ web mà không thấy token)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Hàm kiểm tra quyền (SECURITY DEFINER tránh đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_wedding_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_wedding_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

-- 4. Trigger tự động tạo hồ sơ khi có tài khoản mới trong auth.users
--    - Người ĐẦU TIÊN tạo tài khoản tự động trở thành Admin & đã kích hoạt.
--    - Các tài khoản sau mặc định is_active = false cho đến khi Admin gán quyền & kích hoạt.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
  req_role text;
  final_role text;
  active_flag boolean;
  display_name text;
BEGIN
  SELECT count(*) INTO existing_count FROM public.user_profiles;
  req_role := coalesce(new.raw_user_meta_data->>'role', '');
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  IF existing_count = 0 THEN
    final_role := 'admin';
    active_flag := true;
  ELSE
    IF req_role IN ('groom', 'bride') THEN
      final_role := req_role;
    ELSE
      final_role := 'groom';
    END IF;
    active_flag := false;
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (new.id, coalesce(new.email, ''), display_name, final_role, active_flag)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Chính sách bảo mật (RLS Policies) cho user_profiles
DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
CREATE POLICY "users_read_own_profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_wedding_admin());

DROP POLICY IF EXISTS "admin_update_profiles" ON public.user_profiles;
CREATE POLICY "admin_update_profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_wedding_admin())
  WITH CHECK (public.is_wedding_admin());

DROP POLICY IF EXISTS "admin_delete_profiles" ON public.user_profiles;
CREATE POLICY "admin_delete_profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_wedding_admin());

-- 6. Chính sách bảo mật (RLS Policies) cho app_settings
--    - Chỉ tài khoản đã đăng nhập & được kích hoạt mới đọc được cấu hình đồng bộ
--    - Chỉ Admin mới được thêm/sửa/xóa cấu hình đồng bộ
DROP POLICY IF EXISTS "active_users_read_app_settings" ON public.app_settings;
CREATE POLICY "active_users_read_app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (public.is_active_wedding_user());

DROP POLICY IF EXISTS "admin_manage_app_settings" ON public.app_settings;
CREATE POLICY "admin_manage_app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_wedding_admin())
  WITH CHECK (public.is_wedding_admin());

-- 7. Hàm công khai kiểm tra xem hệ thống đã có Admin đầu tiên chưa (chỉ trả true/false)
CREATE OR REPLACE FUNCTION public.has_any_wedding_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE role = 'admin' AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_any_wedding_admin() TO anon, authenticated;
