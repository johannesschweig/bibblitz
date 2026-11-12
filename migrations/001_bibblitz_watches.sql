-- Shelf watch ("Wecker"): one row per address and record. Paste into the SQL editor of the Supabase project
-- (tjciulpzrgwodmhymujs, region eu-west-2 London, shared with the lecker3000 app; the server cannot run DDL). The table holds e-mail addresses: row level security is ON and there are
-- NO policies, so the public (anon / publishable) key can neither read nor write it. Only the server, with the
-- secret (service role) key, which bypasses row level security. See docs/shelf-watch.md.

create table if not exists public.bibblitz_watches (
  id            uuid primary key default gen_random_uuid(),
  -- Lowercased by the server, so the unique constraint below catches the same address in another case
  email         text not null check (char_length(email) <= 254),
  -- VÖBB record id (numeric string, may have leading zeros)
  media_id      text not null check (media_id ~ '^[0-9]{1,12}$'),
  -- Main title at subscription time, for the mails
  media_title   text not null default '',
  -- Ids from app/assets/libraries.json, the libraries the visitor wants to wait for
  library_ids   text[] not null check (cardinality(library_ids) between 1 and 20),
  status        text not null default 'pending' check (status in ('pending', 'active')),
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  -- pending: the confirmation link is valid until then (24 h); active: the Wecker runs until then (180 days)
  expires_at    timestamptz not null,
  last_checked_at timestamptz,
  unique (email, media_id)
);

create index if not exists bibblitz_watches_status_idx on public.bibblitz_watches (status);
create index if not exists bibblitz_watches_expires_idx on public.bibblitz_watches (expires_at);

alter table public.bibblitz_watches enable row level security;

-- Belt and braces on top of "no policies": the API roles get no table privileges at all
revoke all on public.bibblitz_watches from anon, authenticated;
