-- Doña Chela: lista negra pública de estafadores.
create table if not exists casos (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  canal text not null default 'web',          -- web | telegram
  guion text,                                  -- tipo de estafa: falso nieto, premio, etc.
  cuenta text, celular text, banco text, titular text,
  qr boolean not null default false,
  minutos int not null default 0,              -- minutos que Chela le hizo perder
  hash text,                                   -- sha256 del caso (lo que se sella)
  tx text,                                     -- hash de la transacción en Avalanche Fuji
  ejemplo boolean not null default false
);
alter table casos enable row level security;
-- Cualquiera puede consultar la lista negra; solo n8n (service_role) escribe.
drop policy if exists "lectura publica" on casos;
create policy "lectura publica" on casos for select using (true);
-- Agregar el tx del sello desde la web: solo si aún no tiene uno.
create or replace function sellar_caso(p_id uuid, p_tx text) returns void
language sql security definer set search_path = public as $$
  update casos set tx = p_tx where id = p_id and tx is null and p_tx ~ '^0x[0-9a-f]{64}$';
$$;
grant execute on function sellar_caso(uuid, text) to anon;
create index if not exists casos_cuenta on casos (cuenta);
create index if not exists casos_celular on casos (celular);
