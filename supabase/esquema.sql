-- MINUME XVII · estructura de la base de datos (Supabase) · Albert Silvestre
-- Exportada el 21 de octubre de 2026 desde el proyecto de Supabase que usan los sistemas del staff.
-- Solo la estructura: tablas, funciones y permisos. NO trae códigos de acceso, sesiones ni datos del evento.
-- Para montarla en un proyecto nuevo: pegar este archivo completo en el SQL Editor de Supabase y ejecutarlo.
-- Después, crear el primer código de Coordinación general a mano (ver el final del archivo).

create extension if not exists pgcrypto with schema extensions;

-- =================== Tablas ===================
-- Ninguna tabla se lee directo: RLS activado sin políticas; todo pasa por las funciones de abajo con la sesión (token).

create table if not exists public.minume_codigos (
  id bigint generated always as identity primary key,
  ref text not null unique default ('p'::text || substr(md5(((random())::text || (clock_timestamp())::text)), 1, 10)),
  prefijo text not null check (prefijo = any (array['AS', 'CO', 'SE', 'TR', 'BI', 'EP', 'CG'])),
  hash text not null,                         -- el código cifrado con bcrypt; el código completo no se guarda
  nombre text not null check (length(nombre) between 1 and 80),
  rol text not null,
  sistema text not null,
  area text check (area = any (array['fisico', 'emocional'])),
  comision text,
  acr text,
  activo boolean not null default true,
  creado timestamptz not null default now(),
  creado_por text,
  usado timestamptz
);
create index if not exists minume_codigos_prefijo_idx on public.minume_codigos using btree (prefijo) where activo;

create table if not exists public.minume_sesiones (
  token_hash text primary key,
  codigo_id bigint not null references public.minume_codigos(id) on delete cascade,
  creada timestamptz not null default now(),
  vence timestamptz not null
);
create index if not exists minume_sesiones_codigo_id_idx on public.minume_sesiones using btree (codigo_id);

create table if not exists public.minume_intentos (
  id bigint generated always as identity primary key,
  en timestamptz not null default now(),
  ok boolean not null,
  ip text
);
create index if not exists minume_intentos_en_idx on public.minume_intentos using btree (en);

-- Datos compartidos entre equipos: una fila por clave «minume.compartido.*» (las «config.*» son lo editado en «Datos del evento»)
create table if not exists public.minume_compartido (
  clave text primary key check (clave ~ '^minume\.compartido\.[a-z0-9._-]{1,80}$'),
  valor jsonb not null,
  por text,
  actualizado timestamptz not null default now()
);

-- Chat del staff
create table if not exists public.minume_chat (
  id bigserial primary key,
  canal text not null check (canal in ('general', 'asistencia', 'seguridad', 'bienestar', 'eventos', 'coordinacion')),
  codigo_id bigint not null references public.minume_codigos(id) on delete cascade,
  nombre text not null, sistema text not null, rol text not null,
  texto text not null check (char_length(texto) between 1 and 600),
  urgente boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists minume_chat_canal_id on public.minume_chat (canal, id desc);
create index if not exists minume_chat_autor on public.minume_chat (codigo_id, creado desc);
create table if not exists public.minume_chat_visto (
  codigo_id bigint not null references public.minume_codigos(id) on delete cascade,
  canal text not null, ultimo bigint not null default 0, actualizado timestamptz not null default now(),
  primary key (codigo_id, canal)
);
create table if not exists public.minume_chat_recibido (
  mensaje_id bigint not null references public.minume_chat(id) on delete cascade,
  codigo_id bigint not null references public.minume_codigos(id) on delete cascade,
  nombre text not null, creado timestamptz not null default now(),
  primary key (mensaje_id, codigo_id)
);

alter table public.minume_codigos enable row level security;
alter table public.minume_sesiones enable row level security;
alter table public.minume_intentos enable row level security;
alter table public.minume_compartido enable row level security;
alter table public.minume_chat enable row level security;
alter table public.minume_chat_visto enable row level security;
alter table public.minume_chat_recibido enable row level security;
revoke all on public.minume_codigos, public.minume_sesiones, public.minume_intentos, public.minume_compartido,
  public.minume_chat, public.minume_chat_visto, public.minume_chat_recibido from anon, authenticated;

-- =================== Funciones internas ===================

-- Prefijo del código → rol y sistema
create or replace function public.minume_tipo(p_prefijo text, out rol text, out sistema text)
 returns record language sql immutable set search_path to 'public'
as $function$
  select t.rol, t.sistema from (values
    ('AS','asistencia','asistencia'), ('CO','coordinacion','asistencia'), ('SE','seguridad','seguridad'),
    ('TR','traslado','seguridad'), ('BI','bienestar','bienestar'), ('EP','eventos','eventos'), ('CG','coordinacion','coordinacion')
  ) t(p, rol, sistema) where t.p = p_prefijo
$function$;

create or replace function public.minume_ip()
 returns text language sql stable set search_path to 'public'
as $function$
  select coalesce(nullif(trim(split_part(coalesce(
    nullif(current_setting('request.headers', true), '')::json->>'cf-connecting-ip',
    nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for'), ',', 1)), ''), 'desconocida')
$function$;

-- La sesión (token) de quien llama; si no vale, error 28000 y la página pide el código otra vez
create or replace function public.minume_sesion(p_token text)
 returns minume_codigos language plpgsql stable security definer set search_path to 'public', 'extensions'
as $function$
declare r public.minume_codigos;
begin
  select c.* into r from public.minume_sesiones s join public.minume_codigos c on c.id = s.codigo_id
   where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and s.vence > now() and c.activo;
  if not found then raise exception 'Sesión no válida o vencida. Vuelve a entrar con tu código.' using errcode = '28000'; end if;
  return r;
end $function$;

-- Las atenciones de Bienestar solo las leen Bienestar y Coordinación general
create or replace function public.minume_puede_leer(p_rol text, p_sistema text, p_clave text)
 returns boolean language sql immutable set search_path to 'public'
as $function$
  select p_clave <> 'minume.compartido.atenciones' or p_rol = 'bienestar' or p_sistema = 'coordinacion'
$function$;

-- Junta lo que guardan varios teléfonos a la vez: objetos se mezclan por clave y listas con «id» se mezclan por id
create or replace function public.minume_fusion(viejo jsonb, nuevo jsonb)
 returns jsonb language plpgsql immutable set search_path to 'public'
as $function$
declare r jsonb; k text; v jsonb;
begin
  if viejo is null then return nuevo; end if;
  if jsonb_typeof(viejo) = 'object' and jsonb_typeof(nuevo) = 'object' then
    if viejo ? 'dia' and nuevo ? 'dia' and viejo->'dia' is distinct from nuevo->'dia' then return nuevo; end if;
    r := viejo;
    for k, v in select * from jsonb_each(nuevo) loop
      r := jsonb_set(r, array[k], public.minume_fusion(viejo->k, v), true);
    end loop;
    return r;
  elsif jsonb_typeof(viejo) = 'array' and jsonb_typeof(nuevo) = 'array'
        and jsonb_array_length(nuevo) > 0 and jsonb_typeof(nuevo->0) = 'object' and (nuevo->0) ? 'id' then
    select coalesce(jsonb_agg(x order by orden), '[]'::jsonb) into r from (
      select e as x, o as orden from jsonb_array_elements(viejo) with ordinality as t(e, o)
        where not exists (select 1 from jsonb_array_elements(nuevo) n where n->>'id' = e->>'id')
      union all
      select e, 1000000 + o from jsonb_array_elements(nuevo) with ordinality as t(e, o)
    ) s;
    return r;
  else
    return nuevo;
  end if;
end $function$;

-- Código nuevo al azar: prefijo + 6 caracteres sin letras que se confunden (sin 0, O, 1, I, L)
create or replace function public.minume_generar_codigo(p_prefijo text)
 returns text language plpgsql set search_path to 'public', 'extensions'
as $function$
declare a text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; b bytea := gen_random_bytes(6); r text := ''; i int;
begin
  for i in 0..5 loop r := r || substr(a, 1 + (get_byte(b, i) % length(a)), 1); end loop;
  return p_prefijo || '-' || r;
end $function$;

create or replace function public.minume_chat_canales(c public.minume_codigos) returns text[]
 language sql immutable set search_path = public
as $$
  select case when c.sistema = 'coordinacion' then array['general','asistencia','seguridad','bienestar','eventos','coordinacion']
              when c.rol = 'coordinacion' then array['general', c.sistema, 'coordinacion']
              else array['general', c.sistema] end
$$;

-- =================== Funciones que llama la página ===================

-- Entrar con el código: devuelve un token de 30 días (máximo 8 intentos fallidos por IP cada 15 minutos)
create or replace function public.minume_entrar(p_codigo text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare v_ip text := public.minume_ip(); c public.minume_codigos; tok text; v timestamptz := now() + interval '30 days';
begin
  delete from public.minume_intentos where en < now() - interval '1 day';
  delete from public.minume_sesiones where vence < now();
  if (select count(*) from public.minume_intentos where not ok and ip = v_ip and en > now() - interval '15 minutes') >= 8
     or (select count(*) from public.minume_intentos where not ok and en > now() - interval '15 minutes') >= 300 then
    return jsonb_build_object('error', 'Demasiados intentos. Espera 15 minutos y vuelve a probar.');
  end if;
  p_codigo := upper(trim(coalesce(p_codigo, '')));
  if p_codigo ~ '^[A-Z]{2}-[A-Z0-9]{4,8}$' then
    select * into c from public.minume_codigos where activo and prefijo = left(p_codigo, 2) and hash = crypt(p_codigo, hash) limit 1;
  end if;
  if c.id is null then
    insert into public.minume_intentos (ok, ip) values (false, v_ip);
    return jsonb_build_object('error', 'Ese código no existe o fue anulado. Pídele uno a coordinación.');
  end if;
  insert into public.minume_intentos (ok, ip) values (true, v_ip);
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.minume_sesiones (token_hash, codigo_id, vence) values (encode(digest(tok, 'sha256'), 'hex'), c.id, v);
  update public.minume_codigos set usado = now() where id = c.id;
  return jsonb_build_object('token', tok, 'vence', v, 'ref', c.ref, 'nombre', c.nombre, 'rol', c.rol, 'sistema', c.sistema,
    'area', c.area, 'comision', c.comision, 'acr', c.acr, 'prefijo', c.prefijo);
end $function$;

-- Leer los datos compartidos (todos o solo algunas claves)
create or replace function public.minume_datos(p_token text, p_claves text[] default null::text[])
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions'
as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  return jsonb_build_object(
    'filas', coalesce((select jsonb_agg(jsonb_build_object('clave', m.clave, 'valor', m.valor)) from public.minume_compartido m
                       where (p_claves is null or m.clave = any(p_claves)) and public.minume_puede_leer(c.rol, c.sistema, m.clave)), '[]'::jsonb),
    'ocultas', case when public.minume_puede_leer(c.rol, c.sistema, 'minume.compartido.atenciones') then '[]'::jsonb else '["minume.compartido.atenciones"]'::jsonb end,
    'personal', case when p_claves is null then coalesce((select jsonb_agg(jsonb_build_object('ref', k.ref, 'nombre', k.nombre, 'rol', k.rol, 'sistema', k.sistema) order by k.nombre)
                       from public.minume_codigos k where k.activo), '[]'::jsonb) end,
    'yo', jsonb_build_object('ref', c.ref, 'nombre', c.nombre, 'rol', c.rol, 'sistema', c.sistema, 'area', c.area, 'comision', c.comision, 'acr', c.acr));
end $function$;

-- Guardar una clave compartida y avisar en tiempo real (solo el nombre de la clave)
create or replace function public.minume_guardar(p_token text, p_clave text, p_valor jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare c public.minume_codigos := public.minume_sesion(p_token); v jsonb;
begin
  if p_clave !~ '^minume\.compartido\.[a-z0-9._-]{1,80}$' then raise exception 'Clave no permitida'; end if;
  if not public.minume_puede_leer(c.rol, c.sistema, p_clave) then raise exception 'Sin permiso para esta información' using errcode = '42501'; end if;
  if p_valor is null then raise exception 'Valor vacío'; end if;
  if pg_column_size(p_valor) > 800000 then raise exception 'Demasiado grande'; end if;
  insert into public.minume_compartido as m (clave, valor, por, actualizado)
  values (p_clave, p_valor, left(c.nombre, 80), now())
  on conflict (clave) do update
    set valor = case when p_clave like 'minume.compartido.config.%' then excluded.valor else public.minume_fusion(m.valor, excluded.valor) end,
        por = excluded.por, actualizado = now()
  returning valor into v;
  -- Aviso en tiempo real: solo el nombre de la clave; cada teléfono la vuelve a leer con su token
  perform realtime.send(jsonb_build_object('clave', p_clave), 'cambio', 'minume-compartido', false);
  return v;
end $function$;

-- Códigos de acceso (solo Coordinación general)
create or replace function public.minume_codigos_lista(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions'
as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general administra los códigos' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'ref', k.ref, 'prefijo', k.prefijo, 'nombre', k.nombre, 'rol', k.rol, 'sistema', k.sistema,
    'area', k.area, 'comision', k.comision, 'acr', k.acr, 'activo', k.activo, 'creado', k.creado, 'creado_por', k.creado_por, 'usado', k.usado, 'yo', k.id = c.id)
    order by k.activo desc, k.prefijo, k.nombre) from public.minume_codigos k), '[]'::jsonb);
end $function$;

create or replace function public.minume_codigo_crear(p_token text, p_prefijo text, p_nombre text, p_area text default null::text, p_comision text default null::text, p_acr text default null::text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare c public.minume_codigos := public.minume_sesion(p_token); t record; cod text; n public.minume_codigos;
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general crea códigos' using errcode = '42501'; end if;
  select * into t from public.minume_tipo(upper(p_prefijo));
  if t.rol is null then raise exception 'Tipo de código no válido'; end if;
  if length(trim(coalesce(p_nombre, ''))) = 0 then raise exception 'Falta el nombre'; end if;
  cod := public.minume_generar_codigo(upper(p_prefijo));
  insert into public.minume_codigos (prefijo, hash, nombre, rol, sistema, area, comision, acr, creado_por)
  values (upper(p_prefijo), crypt(cod, gen_salt('bf', 8)), left(trim(p_nombre), 80), t.rol, t.sistema,
          case when t.rol = 'bienestar' then coalesce(nullif(p_area, ''), 'fisico') end,
          case when t.rol = 'asistencia' then nullif(left(trim(coalesce(p_comision, '')), 20), '') end,
          nullif(left(trim(coalesce(p_acr, '')), 20), ''), c.nombre)
  returning * into n;
  return jsonb_build_object('codigo', cod, 'id', n.id, 'nombre', n.nombre, 'rol', n.rol, 'sistema', n.sistema);
end $function$;

create or replace function public.minume_codigo_activo(p_token text, p_id bigint, p_activo boolean)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general anula códigos' using errcode = '42501'; end if;
  if p_id = c.id and not p_activo then raise exception 'No puedes anular tu propio código'; end if;
  update public.minume_codigos set activo = p_activo where id = p_id;
  if not found then raise exception 'Ese código no existe'; end if;
  if not p_activo then delete from public.minume_sesiones where codigo_id = p_id; end if;
  return jsonb_build_object('id', p_id, 'activo', p_activo);
end $function$;

-- Chat: enviar, leer, marcar visto, resumen de «sin leer» y «Recibido» de los urgentes
create or replace function public.minume_chat_enviar(p_token text, p_canal text, p_texto text, p_urgente boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); t text := btrim(coalesce(p_texto, '')); v public.minume_chat;
begin
  if not (p_canal = any(public.minume_chat_canales(c))) then raise exception 'No tienes acceso a ese canal' using errcode = '42501'; end if;
  if char_length(t) = 0 then raise exception 'El mensaje está vacío'; end if;
  if char_length(t) > 600 then t := left(t, 600); end if;
  if (select count(*) from public.minume_chat where codigo_id = c.id and creado > now() - interval '1 minute') >= 30 then
    raise exception 'Vas muy rápido: espera un momento'; end if;
  insert into public.minume_chat (canal, codigo_id, nombre, sistema, rol, texto, urgente)
  values (p_canal, c.id, left(c.nombre, 80), c.sistema, c.rol, t, coalesce(p_urgente, false)) returning * into v;
  insert into public.minume_chat_visto (codigo_id, canal, ultimo) values (c.id, p_canal, v.id)
    on conflict (codigo_id, canal) do update set ultimo = greatest(minume_chat_visto.ultimo, excluded.ultimo), actualizado = now();
  delete from public.minume_chat where creado < now() - interval '14 days';
  perform realtime.send(jsonb_build_object('canal', p_canal, 'id', v.id), 'chat', 'minume-compartido', false);
  return jsonb_build_object('id', v.id, 'creado', v.creado);
end $$;

create or replace function public.minume_chat_leer(p_token text, p_canal text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); r jsonb;
begin
  if not (p_canal = any(public.minume_chat_canales(c))) then raise exception 'No tienes acceso a ese canal' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(x order by (x->>'id')::bigint), '[]'::jsonb) into r from (
    select jsonb_build_object('id', m.id, 'nombre', m.nombre, 'sistema', m.sistema, 'rol', m.rol, 'texto', m.texto, 'urgente', m.urgente,
      'creado', m.creado, 'mio', m.codigo_id = c.id,
      'vistos', (select count(*) from public.minume_chat_visto v where v.canal = m.canal and v.ultimo >= m.id and v.codigo_id <> m.codigo_id),
      'recibido', case when m.urgente then (select coalesce(jsonb_agg(rc.nombre order by rc.creado), '[]'::jsonb) from public.minume_chat_recibido rc where rc.mensaje_id = m.id) end,
      'yaRecibi', case when m.urgente then exists (select 1 from public.minume_chat_recibido rc where rc.mensaje_id = m.id and rc.codigo_id = c.id) end) as x
    from public.minume_chat m where m.canal = p_canal order by m.id desc limit 80
  ) s;
  return r;
end $$;

create or replace function public.minume_chat_visto(p_token text, p_canal text, p_ultimo bigint)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if not (p_canal = any(public.minume_chat_canales(c))) then return; end if;
  insert into public.minume_chat_visto (codigo_id, canal, ultimo) values (c.id, p_canal, coalesce(p_ultimo, 0))
    on conflict (codigo_id, canal) do update set ultimo = greatest(minume_chat_visto.ultimo, excluded.ultimo), actualizado = now();
end $$;

create or replace function public.minume_chat_resumen(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); r jsonb;
begin
  select coalesce(jsonb_object_agg(k, jsonb_build_object(
      'sinLeer', (select count(*) from public.minume_chat m where m.canal = k and m.codigo_id <> c.id
                    and m.id > coalesce((select v.ultimo from public.minume_chat_visto v where v.codigo_id = c.id and v.canal = k), 0)),
      'urgentes', (select count(*) from public.minume_chat m where m.canal = k and m.urgente and m.codigo_id <> c.id and m.creado > now() - interval '6 hours'
                    and not exists (select 1 from public.minume_chat_recibido rc where rc.mensaje_id = m.id and rc.codigo_id = c.id)),
      'ultimo', (select jsonb_build_object('id', m.id, 'nombre', m.nombre, 'texto', left(m.texto, 120), 'urgente', m.urgente, 'mio', m.codigo_id = c.id, 'creado', m.creado)
                   from public.minume_chat m where m.canal = k order by m.id desc limit 1))), '{}'::jsonb)
    into r from unnest(public.minume_chat_canales(c)) as k;
  return r;
end $$;

create or replace function public.minume_chat_recibido(p_token text, p_id bigint)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); k text;
begin
  select canal into k from public.minume_chat where id = p_id and urgente;
  if k is null or not (k = any(public.minume_chat_canales(c))) then return; end if;
  insert into public.minume_chat_recibido (mensaje_id, codigo_id, nombre) values (p_id, c.id, left(c.nombre, 80)) on conflict do nothing;
  perform realtime.send(jsonb_build_object('canal', k, 'id', p_id), 'chat', 'minume-compartido', false);
end $$;

-- =================== Permisos ===================
-- Las internas no se pueden llamar desde la página; las demás piden siempre el token de la sesión.
revoke all on function public.minume_tipo(text), public.minume_ip(), public.minume_sesion(text), public.minume_puede_leer(text, text, text),
  public.minume_fusion(jsonb, jsonb), public.minume_generar_codigo(text), public.minume_chat_canales(public.minume_codigos) from public, anon, authenticated;
grant execute on function public.minume_entrar(text), public.minume_datos(text, text[]), public.minume_guardar(text, text, jsonb),
  public.minume_codigos_lista(text), public.minume_codigo_crear(text, text, text, text, text, text), public.minume_codigo_activo(text, bigint, boolean),
  public.minume_chat_enviar(text, text, text, boolean), public.minume_chat_leer(text, text), public.minume_chat_visto(text, text, bigint),
  public.minume_chat_resumen(text), public.minume_chat_recibido(text, bigint) to anon, authenticated;

-- =================== Primer código de Coordinación general ===================
-- Cambia «CG-XXXXXX» por un código que solo tú conozcas (CG- y 6 letras o números) y tu nombre, y ejecuta:
-- insert into public.minume_codigos (prefijo, hash, nombre, rol, sistema, creado_por)
-- values ('CG', extensions.crypt('CG-XXXXXX', extensions.gen_salt('bf', 8)), 'Tu nombre', 'coordinacion', 'coordinacion', 'inicio');
-- Con ese código entras a Coordinación general y desde «Datos del evento → Códigos de acceso» creas los de todo el staff.
