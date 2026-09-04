-- ==========================================
-- VOITSFEST 2026 - Supabase Setup & Seeding
-- ==========================================

-- 1. Create a Trigger to automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'whatsapp_number',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Seed the Database with Admin and Security Accounts
-- Enable pgcrypto extension if not enabled (required for crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_uid UUID := gen_random_uuid();
  security_uid UUID := gen_random_uuid();
BEGIN
  ---------------------------------------------------
  -- A. ADMIN ACCOUNT
  ---------------------------------------------------
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_uid,
    'authenticated',
    'authenticated',
    'admin@voitsfest.id',
    crypt('VoitsAdmin2025!', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name": "VOITSFEST Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    admin_uid,
    format('{"sub":"%s","email":"%s"}', admin_uid::text, 'admin@voitsfest.id')::jsonb,
    'email',
    admin_uid::text,
    now(),
    now(),
    now()
  );

  ---------------------------------------------------
  -- B. SECURITY ACCOUNT
  ---------------------------------------------------
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    security_uid,
    'authenticated',
    'authenticated',
    'security@voitsfest.id',
    crypt('V0itsSecurity!2025', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name": "VOITSFEST Security"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    security_uid,
    format('{"sub":"%s","email":"%s"}', security_uid::text, 'security@voitsfest.id')::jsonb,
    'email',
    security_uid::text,
    now(),
    now(),
    now()
  );

  ---------------------------------------------------
  -- C. OVERRIDE PROFILES ROLE
  ---------------------------------------------------
  -- Since the trigger fired and created them as 'user', we update them to their correct roles.
  UPDATE public.profiles
  SET 
    role = 'admin'
  WHERE id = admin_uid;

  UPDATE public.profiles
  SET 
    role = 'security'
  WHERE id = security_uid;

  ---------------------------------------------------
  -- D. SEED CMS GATEWAYS DEFAULTS
  ---------------------------------------------------
  INSERT INTO public.cms_settings (key, value)
  VALUES (
    'gateways',
    '{"bpc": true, "bcc": true, "seminar": true, "tenant": true, "cfr": true, "festival": true}'::jsonb
  )
  ON CONFLICT (key) DO NOTHING;

  INSERT INTO public.cms_settings (key, value)
  VALUES (
    'pricing_tiers',
    '{"festival": {"phase": "Presale 2", "price": 75000}, "colorfun": {"phase": "Normal Price", "price": 75000}, "seminar": {"phase": "Normal Price", "price": 10000}, "bcc": {"phase": "Batch 1", "price": 79000}, "bpc": {"phase": "Batch 1", "price": 79000}, "tenant": {"phase": "Regular", "price": 10000}}'::jsonb
  )
  ON CONFLICT (key) DO NOTHING;

END;
$$;
