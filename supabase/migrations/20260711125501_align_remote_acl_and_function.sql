-- Bootstrap alignment captured from Supabase Baseline Bootstrap run 29153388795.
-- The production project already has this effective ACL/function state.
-- This migration is applied only to local/new environments and is marked applied remotely during bootstrap.

revoke delete on table "public"."external_catch_memos" from "anon";

revoke insert on table "public"."external_catch_memos" from "anon";

revoke references on table "public"."external_catch_memos" from "anon";

revoke select on table "public"."external_catch_memos" from "anon";

revoke trigger on table "public"."external_catch_memos" from "anon";

revoke truncate on table "public"."external_catch_memos" from "anon";

revoke update on table "public"."external_catch_memos" from "anon";

revoke delete on table "public"."external_catch_memos" from "authenticated";

revoke references on table "public"."external_catch_memos" from "authenticated";

revoke trigger on table "public"."external_catch_memos" from "authenticated";

revoke truncate on table "public"."external_catch_memos" from "authenticated";

revoke delete on table "public"."external_catch_memos" from "service_role";

revoke insert on table "public"."external_catch_memos" from "service_role";

revoke select on table "public"."external_catch_memos" from "service_role";

revoke update on table "public"."external_catch_memos" from "service_role";

revoke delete on table "public"."fish_species" from "anon";

revoke insert on table "public"."fish_species" from "anon";

revoke references on table "public"."fish_species" from "anon";

revoke trigger on table "public"."fish_species" from "anon";

revoke truncate on table "public"."fish_species" from "anon";

revoke update on table "public"."fish_species" from "anon";

revoke delete on table "public"."fish_species" from "authenticated";

revoke insert on table "public"."fish_species" from "authenticated";

revoke references on table "public"."fish_species" from "authenticated";

revoke trigger on table "public"."fish_species" from "authenticated";

revoke truncate on table "public"."fish_species" from "authenticated";

revoke update on table "public"."fish_species" from "authenticated";

revoke delete on table "public"."fish_species" from "service_role";

revoke insert on table "public"."fish_species" from "service_role";

revoke select on table "public"."fish_species" from "service_role";

revoke update on table "public"."fish_species" from "service_role";

revoke delete on table "public"."fishing_spots" from "anon";

revoke insert on table "public"."fishing_spots" from "anon";

revoke references on table "public"."fishing_spots" from "anon";

revoke trigger on table "public"."fishing_spots" from "anon";

revoke truncate on table "public"."fishing_spots" from "anon";

revoke update on table "public"."fishing_spots" from "anon";

revoke delete on table "public"."fishing_spots" from "authenticated";

revoke insert on table "public"."fishing_spots" from "authenticated";

revoke references on table "public"."fishing_spots" from "authenticated";

revoke trigger on table "public"."fishing_spots" from "authenticated";

revoke truncate on table "public"."fishing_spots" from "authenticated";

revoke update on table "public"."fishing_spots" from "authenticated";

revoke delete on table "public"."fishing_spots" from "service_role";

revoke insert on table "public"."fishing_spots" from "service_role";

revoke select on table "public"."fishing_spots" from "service_role";

revoke update on table "public"."fishing_spots" from "service_role";

revoke delete on table "public"."source_registry" from "anon";

revoke insert on table "public"."source_registry" from "anon";

revoke references on table "public"."source_registry" from "anon";

revoke trigger on table "public"."source_registry" from "anon";

revoke truncate on table "public"."source_registry" from "anon";

revoke update on table "public"."source_registry" from "anon";

revoke delete on table "public"."source_registry" from "authenticated";

revoke insert on table "public"."source_registry" from "authenticated";

revoke references on table "public"."source_registry" from "authenticated";

revoke trigger on table "public"."source_registry" from "authenticated";

revoke truncate on table "public"."source_registry" from "authenticated";

revoke update on table "public"."source_registry" from "authenticated";

revoke delete on table "public"."source_registry" from "service_role";

revoke insert on table "public"."source_registry" from "service_role";

revoke select on table "public"."source_registry" from "service_role";

revoke update on table "public"."source_registry" from "service_role";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.soft_delete_external_catch_memo(p_memo_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := auth.uid();
  updated_count integer := 0;
begin
  if caller_id is null then
    return false;
  end if;

  update public.external_catch_memos
  set
    is_deleted = true,
    updated_at = pg_catalog.now()
  where
    id = p_memo_id
    and owner_id = caller_id
    and created_by = 'authenticated_user'
    and is_deleted = false;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$function$
;
