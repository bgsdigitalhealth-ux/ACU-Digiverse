-- ==============================================================================
-- RESET PASSWORD & ACTIVATE SUPER ADMIN
-- Email: dynamicsajjan@gmail.com
-- Password: BGSMCHApple9844?
-- ==============================================================================

-- 1. Ensure extensions and pgcrypto exist
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Update auth.users with the new encrypted password (BGSMCHApple9844?) and confirmed status
UPDATE auth.users
SET 
  encrypted_password = crypt('BGSMCHApple9844?', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now(),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data = '{"name":"Super Admin"}'::jsonb
WHERE email = 'dynamicsajjan@gmail.com';

-- 3. In case the user doesn't exist in auth.users, create it directly
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'dynamicsajjan@gmail.com',
  crypt('BGSMCHApple9844?', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Super Admin"}'::jsonb,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'dynamicsajjan@gmail.com'
);

-- 4. Create or update profile in public.profiles
INSERT INTO public.profiles (id, name, email, college_id, dept_id)
SELECT id, 'Super Admin', email, NULL, NULL
FROM auth.users
WHERE email = 'dynamicsajjan@gmail.com'
ON CONFLICT (id) DO UPDATE
SET name = 'Super Admin', email = 'dynamicsajjan@gmail.com', college_id = NULL, dept_id = NULL;

-- 5. Assign 'su' (Super Admin) role in public.user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'su'
FROM auth.users
WHERE email = 'dynamicsajjan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Verify result
SELECT u.id, u.email, u.email_confirmed_at, r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email = 'dynamicsajjan@gmail.com';
