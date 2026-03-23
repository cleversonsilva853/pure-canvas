
-- Drop couple-related tables
DROP TABLE IF EXISTS public.couple_transactions CASCADE;
DROP TABLE IF EXISTS public.couple_wallets CASCADE;
DROP TABLE IF EXISTS public.couple_invites CASCADE;
DROP TABLE IF EXISTS public.couples CASCADE;

-- Drop couple-related functions
DROP FUNCTION IF EXISTS public.is_couple_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_couple_id(uuid);
