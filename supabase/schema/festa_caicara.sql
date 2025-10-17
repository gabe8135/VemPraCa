-- Supabase schema para avaliações e scans da Festança Caiçara

create table if not exists public.avaliacoes_festa_caicara (
  id uuid primary key default gen_random_uuid(),
  estande_slug text not null,
  nome_comentario text,
  email_comentario text,
  nota int2 not null check (nota >= 0 and nota <= 5),
  comentario text,
  created_at timestamptz not null default now()
);

create index if not exists idx_avaliacoes_festa_slug on public.avaliacoes_festa_caicara (estande_slug);

create table if not exists public.scans_festa_caicara (
  id bigserial primary key,
  estande_slug text not null,
  user_agent text,
  referer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_scans_festa_slug on public.scans_festa_caicara (estande_slug);

-- RLS
alter table public.avaliacoes_festa_caicara enable row level security;
alter table public.scans_festa_caicara enable row level security;

do $$ begin
  create policy "public can insert rating" on public.avaliacoes_festa_caicara for insert to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public can insert scan" on public.scans_festa_caicara for insert to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

