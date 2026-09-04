-- Run this in your Supabase SQL Editor to create the buckets for registrations and payment-proofs

-- 1. Create the buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('registrations', 'registrations', true),
  ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for registrations bucket
CREATE POLICY "Public Insert Registrations" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'registrations');

CREATE POLICY "Public Select Registrations" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'registrations');

-- 3. Policies for payment-proofs bucket
CREATE POLICY "Public Select Payment Proofs" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated Insert Payment Proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Public Insert Payment Proofs Fallback" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'payment-proofs');
