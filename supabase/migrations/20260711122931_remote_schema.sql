-- Initial public-schema baseline captured from the production Supabase project.
-- Source: Supabase Remote History Check run 29152672515.
-- This migration represents schema already present in production and must be marked applied there before automated db push is enabled.

create table "public"."external_catch_memos" (
    "id" text not null,
    "species" text not null,
    "caught_date" date not null,
    "area_name" text not null,
    "estimated_spot_name" text,
    "spot_id" text,
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "coordinate_precision" text not null default 'unknown'::text,
    "method" text,
    "catch_count" integer,
    "size_cm" numeric(5,1),
    "source_id" text not null,
    "source_name" text not null,
    "source_url" text not null,
    "acquisition_method" text not null default 'manual'::text,
    "confidence" text not null default 'medium'::text,
    "environment_match_notes" text[] not null default '{}'::text[],
    "user_memo" text,
    "owner_id" uuid,
    "created_by" text not null default 'manual_local_storage_migration'::text,
    "is_deleted" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."external_catch_memos" enable row level security;

create table "public"."fish_species" (
    "id" text not null,
    "name_ja" text not null,
    "category" text not null,
    "season_months" smallint[] not null default '{}'::smallint[],
    "display_order" integer not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."fish_species" enable row level security;

create table "public"."fishing_spots" (
    "id" text not null,
    "name" text not null,
    "area_name" text not null,
    "latitude" numeric(9,6) not null,
    "longitude" numeric(9,6) not null,
    "spot_type" text not null,
    "shore_access" text not null,
    "coordinate_precision" text not null,
    "target_species" text[] not null default '{}'::text[],
    "recommended_methods" text[] not null default '{}'::text[],
    "notes" text[] not null default '{}'::text[],
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."fishing_spots" enable row level security;

create table "public"."source_registry" (
    "source_id" text not null,
    "source_name" text not null,
    "source_type" text not null,
    "target_area_names" text[] not null default '{}'::text[],
    "base_url" text not null,
    "crawl_policy" text not null,
    "robots_status" text not null,
    "terms_status" text not null,
    "reviewed_at" date,
    "review_urls" text[] not null default '{}'::text[],
    "review_summary" text,
    "notes" text[] not null default '{}'::text[],
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."source_registry" enable row level security;

CREATE INDEX external_catch_memos_active_updated_idx ON public.external_catch_memos USING btree (is_deleted, updated_at DESC);
CREATE INDEX external_catch_memos_area_name_idx ON public.external_catch_memos USING btree (area_name);
CREATE INDEX external_catch_memos_caught_date_idx ON public.external_catch_memos USING btree (caught_date DESC);
CREATE INDEX external_catch_memos_owner_id_idx ON public.external_catch_memos USING btree (owner_id);
CREATE UNIQUE INDEX external_catch_memos_pkey ON public.external_catch_memos USING btree (id);
CREATE INDEX external_catch_memos_source_id_idx ON public.external_catch_memos USING btree (source_id);
CREATE INDEX external_catch_memos_species_idx ON public.external_catch_memos USING btree (species);
CREATE INDEX external_catch_memos_spot_id_idx ON public.external_catch_memos USING btree (spot_id);
CREATE INDEX fish_species_category_idx ON public.fish_species USING btree (category);
CREATE INDEX fish_species_display_order_idx ON public.fish_species USING btree (display_order);
CREATE UNIQUE INDEX fish_species_name_ja_key ON public.fish_species USING btree (name_ja);
CREATE UNIQUE INDEX fish_species_pkey ON public.fish_species USING btree (id);
CREATE INDEX fishing_spots_area_name_idx ON public.fishing_spots USING btree (area_name);
CREATE INDEX fishing_spots_coordinate_precision_idx ON public.fishing_spots USING btree (coordinate_precision);
CREATE UNIQUE INDEX fishing_spots_name_area_name_key ON public.fishing_spots USING btree (name, area_name);
CREATE UNIQUE INDEX fishing_spots_pkey ON public.fishing_spots USING btree (id);
CREATE INDEX fishing_spots_spot_type_idx ON public.fishing_spots USING btree (spot_type);
CREATE INDEX source_registry_crawl_policy_idx ON public.source_registry USING btree (crawl_policy);
CREATE UNIQUE INDEX source_registry_pkey ON public.source_registry USING btree (source_id);
CREATE INDEX source_registry_reviewed_at_idx ON public.source_registry USING btree (reviewed_at);
CREATE INDEX source_registry_robots_status_idx ON public.source_registry USING btree (robots_status);
CREATE INDEX source_registry_source_type_idx ON public.source_registry USING btree (source_type);
CREATE INDEX source_registry_terms_status_idx ON public.source_registry USING btree (terms_status);

alter table "public"."external_catch_memos" add constraint "external_catch_memos_pkey" PRIMARY KEY using index "external_catch_memos_pkey";
alter table "public"."fish_species" add constraint "fish_species_pkey" PRIMARY KEY using index "fish_species_pkey";
alter table "public"."fishing_spots" add constraint "fishing_spots_pkey" PRIMARY KEY using index "fishing_spots_pkey";
alter table "public"."source_registry" add constraint "source_registry_pkey" PRIMARY KEY using index "source_registry_pkey";

alter table "public"."external_catch_memos" add constraint "external_catch_memos_acquisition_method_check" CHECK ((acquisition_method = ANY (ARRAY['manual'::text, 'ai_assisted'::text, 'auto'::text]))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_acquisition_method_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_confidence_check" CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_confidence_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_coordinate_precision_check" CHECK ((coordinate_precision = ANY (ARRAY['exact'::text, 'approximate'::text, 'rounded'::text, 'unknown'::text]))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_coordinate_precision_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_count_check" CHECK (((catch_count IS NULL) OR (catch_count >= 0))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_count_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_created_by_check" CHECK ((created_by = ANY (ARRAY['manual_local_storage_migration'::text, 'authenticated_user'::text, 'admin_import'::text]))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_created_by_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_environment_notes_check" CHECK ((array_position(environment_match_notes, NULL::text) IS NULL)) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_environment_notes_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_latitude_check" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_latitude_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_longitude_check" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_longitude_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_owner_id_fkey";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_size_cm_check" CHECK (((size_cm IS NULL) OR (size_cm >= (0)::numeric))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_size_cm_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_source_id_fkey" FOREIGN KEY (source_id) REFERENCES source_registry(source_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_source_id_fkey";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_source_url_check" CHECK ((source_url ~ '^https?://'::text)) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_source_url_check";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_spot_id_fkey" FOREIGN KEY (spot_id) REFERENCES fishing_spots(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_spot_id_fkey";
alter table "public"."external_catch_memos" add constraint "external_catch_memos_user_memo_length_check" CHECK (((user_memo IS NULL) OR (char_length(user_memo) <= 240))) not valid;
alter table "public"."external_catch_memos" validate constraint "external_catch_memos_user_memo_length_check";
alter table "public"."fish_species" add constraint "fish_species_category_check" CHECK ((category = ANY (ARRAY['fish'::text, 'squid'::text, 'category'::text]))) not valid;
alter table "public"."fish_species" validate constraint "fish_species_category_check";
alter table "public"."fish_species" add constraint "fish_species_name_ja_key" UNIQUE using index "fish_species_name_ja_key";
alter table "public"."fish_species" add constraint "fish_species_season_months_check" CHECK (((array_position(season_months, NULL::smallint) IS NULL) AND (season_months <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint, (8)::smallint, (9)::smallint, (10)::smallint, (11)::smallint, (12)::smallint]))) not valid;
alter table "public"."fish_species" validate constraint "fish_species_season_months_check";
alter table "public"."fishing_spots" add constraint "fishing_spots_coordinate_precision_check" CHECK ((coordinate_precision = ANY (ARRAY['exact'::text, 'approximate'::text, 'rounded'::text]))) not valid;
alter table "public"."fishing_spots" validate constraint "fishing_spots_coordinate_precision_check";
alter table "public"."fishing_spots" add constraint "fishing_spots_latitude_check" CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))) not valid;
alter table "public"."fishing_spots" validate constraint "fishing_spots_latitude_check";
alter table "public"."fishing_spots" add constraint "fishing_spots_longitude_check" CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))) not valid;
alter table "public"."fishing_spots" validate constraint "fishing_spots_longitude_check";
alter table "public"."fishing_spots" add constraint "fishing_spots_name_area_name_key" UNIQUE using index "fishing_spots_name_area_name_key";
alter table "public"."fishing_spots" add constraint "fishing_spots_notes_check" CHECK ((array_position(notes, NULL::text) IS NULL)) not valid;
alter table "public"."fishing_spots" validate constraint "fishing_spots_notes_check";
alter table "public"."fishing_spots" add constraint "fishing_spots_recommended_methods_check" CHECK ((array_position(recommended_methods, NULL::text) IS NULL)) not valid;
alter table "public"."fishing_spots" validate constraint "fishing_spots_recommended_methods_check";
alter table "public"."fishing_spots" add constraint "fishing_spots_target_species_check" CHECK ((array_position(target_species, NULL::text) IS NULL)) not valid;
alter table "public"."fishing_spots" validate constraint "fishing_spots_target_species_check";
alter table "public"."source_registry" add constraint "source_registry_crawl_policy_check" CHECK ((crawl_policy = ANY (ARRAY['allowed'::text, 'manualOnly'::text, 'referenceOnly'::text, 'unknown'::text]))) not valid;
alter table "public"."source_registry" validate constraint "source_registry_crawl_policy_check";
alter table "public"."source_registry" add constraint "source_registry_notes_check" CHECK ((array_position(notes, NULL::text) IS NULL)) not valid;
alter table "public"."source_registry" validate constraint "source_registry_notes_check";
alter table "public"."source_registry" add constraint "source_registry_review_urls_check" CHECK ((array_position(review_urls, NULL::text) IS NULL)) not valid;
alter table "public"."source_registry" validate constraint "source_registry_review_urls_check";
alter table "public"."source_registry" add constraint "source_registry_robots_status_check" CHECK ((robots_status = ANY (ARRAY['unchecked'::text, 'allowed'::text, 'disallowed'::text, 'partial'::text, 'unknown'::text]))) not valid;
alter table "public"."source_registry" validate constraint "source_registry_robots_status_check";
alter table "public"."source_registry" add constraint "source_registry_source_type_check" CHECK ((source_type = ANY (ARRAY['shop'::text, 'portal'::text, 'tide'::text, 'sns_like'::text, 'other'::text]))) not valid;
alter table "public"."source_registry" validate constraint "source_registry_source_type_check";
alter table "public"."source_registry" add constraint "source_registry_target_area_names_check" CHECK ((array_position(target_area_names, NULL::text) IS NULL)) not valid;
alter table "public"."source_registry" validate constraint "source_registry_target_area_names_check";
alter table "public"."source_registry" add constraint "source_registry_terms_status_check" CHECK ((terms_status = ANY (ARRAY['unchecked'::text, 'allowed'::text, 'restricted'::text, 'unknown'::text]))) not valid;
alter table "public"."source_registry" validate constraint "source_registry_terms_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

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

grant insert on table "public"."external_catch_memos" to "authenticated";
grant select on table "public"."external_catch_memos" to "authenticated";
grant update on table "public"."external_catch_memos" to "authenticated";
grant references on table "public"."external_catch_memos" to "service_role";
grant trigger on table "public"."external_catch_memos" to "service_role";
grant truncate on table "public"."external_catch_memos" to "service_role";
grant select on table "public"."fish_species" to "anon";
grant select on table "public"."fish_species" to "authenticated";
grant references on table "public"."fish_species" to "service_role";
grant trigger on table "public"."fish_species" to "service_role";
grant truncate on table "public"."fish_species" to "service_role";
grant select on table "public"."fishing_spots" to "anon";
grant select on table "public"."fishing_spots" to "authenticated";
grant references on table "public"."fishing_spots" to "service_role";
grant trigger on table "public"."fishing_spots" to "service_role";
grant truncate on table "public"."fishing_spots" to "service_role";
grant select on table "public"."source_registry" to "anon";
grant select on table "public"."source_registry" to "authenticated";
grant references on table "public"."source_registry" to "service_role";
grant trigger on table "public"."source_registry" to "service_role";
grant truncate on table "public"."source_registry" to "service_role";

create policy "external_catch_memos_owner_insert"
on "public"."external_catch_memos"
as permissive
for insert
to authenticated
with check (((owner_id = auth.uid()) AND (is_deleted = false) AND (created_by = 'authenticated_user'::text)));

create policy "external_catch_memos_owner_select"
on "public"."external_catch_memos"
as permissive
for select
to authenticated
using (((owner_id = auth.uid()) AND (is_deleted = false)));

create policy "external_catch_memos_owner_update"
on "public"."external_catch_memos"
as permissive
for update
to authenticated
using ((owner_id = auth.uid()))
with check (((owner_id = auth.uid()) AND (created_by = 'authenticated_user'::text)));

create policy "Allow anon and authenticated read fish species"
on "public"."fish_species"
as permissive
for select
to anon, authenticated
using ((is_active = true));

create policy "Allow anon and authenticated read fishing spots"
on "public"."fishing_spots"
as permissive
for select
to anon, authenticated
using ((is_active = true));

create policy "Allow anon and authenticated read source registry"
on "public"."source_registry"
as permissive
for select
to anon, authenticated
using ((is_active = true));
