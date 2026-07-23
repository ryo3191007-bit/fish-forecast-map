alter table public.external_catch_memos
  add column if not exists catch_items jsonb;

comment on column public.external_catch_memos.catch_items is
  'One catch record''s species details. Legacy species/count/size columns remain for compatibility.';

alter table public.external_catch_memos
  add constraint external_catch_memos_catch_items_array_check
  check (catch_items is null or jsonb_typeof(catch_items) = 'array') not valid;

alter table public.external_catch_memos
  validate constraint external_catch_memos_catch_items_array_check;
