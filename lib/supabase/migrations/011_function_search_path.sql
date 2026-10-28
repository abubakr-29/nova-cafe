-- Hardening: five SECURITY DEFINER functions run with their owner's rights but did not pin
-- search_path. Pinning stops anyone from tricking them into using a look-alike object from
-- another schema. Behaviour is unchanged (all table names inside are already in public,
-- and auth.uid() is schema-qualified).
alter function public.cancel_order(uuid)       set search_path = public;
alter function public.confirm_payment(uuid)    set search_path = public;
alter function public.request_bill(uuid)       set search_path = public;
alter function public.current_restaurant_id()  set search_path = public;
alter function public.is_restaurant_owner()    set search_path = public;