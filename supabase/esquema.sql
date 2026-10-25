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

-- Las atenciones de Bienestar solo las leen Bienestar y Coordinación general; las evaluaciones del staff, solo Coordinación general
create or replace function public.minume_puede_leer(p_rol text, p_sistema text, p_clave text)
 returns boolean language sql immutable set search_path to 'public'
as $function$
  select case p_clave
    when 'minume.compartido.atenciones' then p_rol = 'bienestar' or p_sistema = 'coordinacion'
    when 'minume.compartido.evaluaciones' then p_sistema = 'coordinacion'
    else true end
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
    'ocultas', coalesce((select jsonb_agg(k) from unnest(array['minume.compartido.atenciones', 'minume.compartido.evaluaciones']) k
                       where not public.minume_puede_leer(c.rol, c.sistema, k)), '[]'::jsonb),
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

-- Rendimiento del staff: tiempo activo por día (latido cada minuto) y resumen para Coordinación general
create table if not exists public.minume_actividad (
  codigo_id bigint not null references public.minume_codigos(id) on delete cascade,
  dia date not null,
  primera timestamptz not null default now(),
  ultima timestamptz not null default now(),
  minutos int not null default 0,
  datos jsonb not null default '{}'::jsonb,
  primary key (codigo_id, dia)
);
alter table public.minume_actividad enable row level security;
revoke all on public.minume_actividad from anon, authenticated;

create or replace function public.minume_latido(p_token text, p_datos jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); d date := (now() at time zone 'America/Santo_Domingo')::date; a public.minume_actividad;
begin
  if p_datos is not null and pg_column_size(p_datos) > 8000 then p_datos := '{}'::jsonb; end if;
  select * into a from public.minume_actividad where codigo_id = c.id and dia = d;
  if not found then
    insert into public.minume_actividad (codigo_id, dia, datos) values (c.id, d, coalesce(p_datos, '{}'::jsonb));
  elsif now() - a.ultima >= interval '40 seconds' then
    update public.minume_actividad set
      minutos = minutos + case when now() - a.ultima < interval '3 minutes' then greatest(1, round(extract(epoch from now() - a.ultima) / 60)::int) else 0 end,
      ultima = now(), datos = a.datos || coalesce(p_datos, '{}'::jsonb)
    where codigo_id = c.id and dia = d;
  end if;
end $$;

create or replace function public.minume_rendimiento(p_token text, p_dia date default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); d date := coalesce(p_dia, (now() at time zone 'America/Santo_Domingo')::date);
  ini timestamptz := (d::timestamp at time zone 'America/Santo_Domingo'); fin timestamptz := ((d + 1)::timestamp at time zone 'America/Santo_Domingo');
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general ve el rendimiento del staff' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'ref', k.ref, 'nombre', k.nombre, 'rol', k.rol, 'sistema', k.sistema, 'comision', k.comision, 'area', k.area, 'usado', k.usado,
      'primera', a.primera, 'ultima', a.ultima, 'minutos', coalesce(a.minutos, 0), 'datos', coalesce(a.datos, '{}'::jsonb),
      'chat', (select count(*) from public.minume_chat m where m.codigo_id = k.id and m.creado >= ini and m.creado < fin),
      'urgentesRecibidos', (select count(*) from public.minume_chat_recibido rc join public.minume_chat m on m.id = rc.mensaje_id where rc.codigo_id = k.id and m.creado >= ini and m.creado < fin),
      'respuestaUrgente', (select round(avg(extract(epoch from rc.creado - m.creado))) from public.minume_chat_recibido rc join public.minume_chat m on m.id = rc.mensaje_id where rc.codigo_id = k.id and m.creado >= ini and m.creado < fin)
    ) order by k.sistema, k.nombre)
    from public.minume_codigos k left join public.minume_actividad a on a.codigo_id = k.id and a.dia = d
    where k.activo), '[]'::jsonb);
end $$;

-- =================== Permisos ===================
-- Las internas no se pueden llamar desde la página; las demás piden siempre el token de la sesión.
revoke all on function public.minume_tipo(text), public.minume_ip(), public.minume_sesion(text), public.minume_puede_leer(text, text, text),
  public.minume_fusion(jsonb, jsonb), public.minume_generar_codigo(text), public.minume_chat_canales(public.minume_codigos) from public, anon, authenticated;
grant execute on function public.minume_entrar(text), public.minume_datos(text, text[]), public.minume_guardar(text, text, jsonb),
  public.minume_codigos_lista(text), public.minume_codigo_crear(text, text, text, text, text, text), public.minume_codigo_activo(text, bigint, boolean),
  public.minume_chat_enviar(text, text, text, boolean), public.minume_chat_leer(text, text), public.minume_chat_visto(text, text, bigint),
  public.minume_chat_resumen(text), public.minume_chat_recibido(text, bigint), public.minume_latido(text, jsonb), public.minume_rendimiento(text, date) to anon, authenticated;

-- =================== Primer código de Coordinación general ===================
-- Cambia «CG-XXXXXX» por un código que solo tú conozcas (CG- y 6 letras o números) y tu nombre, y ejecuta:
-- insert into public.minume_codigos (prefijo, hash, nombre, rol, sistema, creado_por)
-- values ('CG', extensions.crypt('CG-XXXXXX', extensions.gen_salt('bf', 8)), 'Tu nombre', 'coordinacion', 'coordinacion', 'inicio');
-- Con ese código entras a Coordinación general y desde «Datos del evento → Códigos de acceso» creas los de todo el staff.

-- =====================================================================
-- 2026-10-24 · Nivel de acceso (reunión del 21 de octubre)
-- «voluntario» ve solo lo suyo; «direccion» (subsecretarios y quien dirige cada equipo) ve todo SU sistema,
-- asigna personas, turnos y refuerzos y edita datos. Coordinación general (sistema coordinacion) ve todo.
-- =====================================================================
alter table public.minume_codigos add column if not exists nivel text not null default 'voluntario' check (nivel in ('voluntario', 'direccion'));
update public.minume_codigos set nivel = 'direccion' where prefijo in ('CO', 'CG');

create or replace function public.minume_entrar(p_codigo text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
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
    'area', c.area, 'comision', c.comision, 'acr', c.acr, 'prefijo', c.prefijo, 'nivel', c.nivel);
end $function$;

create or replace function public.minume_datos(p_token text, p_claves text[] default null::text[])
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  return jsonb_build_object(
    'filas', coalesce((select jsonb_agg(jsonb_build_object('clave', m.clave, 'valor', m.valor)) from public.minume_compartido m
                       where (p_claves is null or m.clave = any(p_claves)) and public.minume_puede_leer(c.rol, c.sistema, m.clave)), '[]'::jsonb),
    'ocultas', coalesce((select jsonb_agg(k) from unnest(array['minume.compartido.atenciones', 'minume.compartido.evaluaciones']) k
                       where not public.minume_puede_leer(c.rol, c.sistema, k)), '[]'::jsonb),
    'personal', case when p_claves is null then coalesce((select jsonb_agg(jsonb_build_object('ref', k.ref, 'nombre', k.nombre, 'rol', k.rol, 'sistema', k.sistema, 'nivel', k.nivel) order by k.nombre)
                       from public.minume_codigos k where k.activo), '[]'::jsonb) end,
    'yo', jsonb_build_object('ref', c.ref, 'nombre', c.nombre, 'rol', c.rol, 'sistema', c.sistema, 'area', c.area, 'comision', c.comision, 'acr', c.acr, 'nivel', c.nivel));
end $function$;

create or replace function public.minume_codigos_lista(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general administra los códigos' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'ref', k.ref, 'prefijo', k.prefijo, 'nombre', k.nombre, 'rol', k.rol, 'sistema', k.sistema,
    'area', k.area, 'comision', k.comision, 'acr', k.acr, 'activo', k.activo, 'creado', k.creado, 'creado_por', k.creado_por, 'usado', k.usado, 'nivel', k.nivel, 'yo', k.id = c.id)
    order by k.activo desc, k.prefijo, k.nombre) from public.minume_codigos k), '[]'::jsonb);
end $function$;

drop function if exists public.minume_codigo_crear(text, text, text, text, text, text);
create or replace function public.minume_codigo_crear(p_token text, p_prefijo text, p_nombre text, p_area text default null, p_comision text default null, p_acr text default null, p_nivel text default 'voluntario')
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token); t record; cod text; n public.minume_codigos;
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general crea códigos' using errcode = '42501'; end if;
  select * into t from public.minume_tipo(upper(p_prefijo));
  if t.rol is null then raise exception 'Tipo de código no válido'; end if;
  if length(trim(coalesce(p_nombre, ''))) = 0 then raise exception 'Falta el nombre'; end if;
  cod := public.minume_generar_codigo(upper(p_prefijo));
  insert into public.minume_codigos (prefijo, hash, nombre, rol, sistema, area, comision, acr, creado_por, nivel)
  values (upper(p_prefijo), crypt(cod, gen_salt('bf', 8)), left(trim(p_nombre), 80), t.rol, t.sistema,
          case when t.rol = 'bienestar' then coalesce(nullif(p_area, ''), 'fisico') end,
          case when t.rol = 'asistencia' then nullif(left(trim(coalesce(p_comision, '')), 20), '') end,
          nullif(left(trim(coalesce(p_acr, '')), 20), ''), c.nombre,
          case when upper(p_prefijo) in ('CO', 'CG') or p_nivel = 'direccion' then 'direccion' else 'voluntario' end)
  returning * into n;
  return jsonb_build_object('codigo', cod, 'id', n.id, 'nombre', n.nombre, 'rol', n.rol, 'sistema', n.sistema, 'nivel', n.nivel);
end $function$;

create or replace function public.minume_codigo_nivel(p_token text, p_id bigint, p_nivel text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general cambia el nivel' using errcode = '42501'; end if;
  if p_nivel not in ('voluntario', 'direccion') then raise exception 'Nivel no válido'; end if;
  if p_id = c.id then raise exception 'No puedes cambiar tu propio nivel'; end if;
  update public.minume_codigos set nivel = case when prefijo in ('CO', 'CG') then 'direccion' else p_nivel end where id = p_id;
  if not found then raise exception 'Ese código no existe'; end if;
  return jsonb_build_object('id', p_id, 'nivel', p_nivel);
end $function$;

-- La dirección de cada equipo también entra al canal de coordinadores del chat
create or replace function public.minume_chat_canales(c public.minume_codigos)
 returns text[] language sql immutable set search_path to 'public' as $function$
  select case when c.sistema = 'coordinacion' then array['general','asistencia','seguridad','bienestar','eventos','coordinacion']
              when c.rol = 'coordinacion' or c.nivel = 'direccion' then array['general', c.sistema, 'coordinacion']
              else array['general', c.sistema] end
$function$;

revoke execute on function public.minume_codigo_crear(text, text, text, text, text, text, text), public.minume_codigo_nivel(text, bigint, text) from public;
grant execute on function public.minume_codigo_crear(text, text, text, text, text, text, text), public.minume_codigo_nivel(text, bigint, text) to anon, authenticated;

-- =====================================================================
-- 2026-10-24 (tarde) · Niveles con los nombres de la organización y seguridad en el servidor
-- Secretaría General (Coordinación general) → Subdirección (subsecretarios) → Coordinación → voluntarios.
-- Coordinación y subdirección administran su equipo. Los datos del evento (config.*) solo los escribe la administración,
-- la bitácora de cada equipo solo ese equipo, y los códigos de prueba (publicados en la guía) no administran códigos.
-- (Estas definiciones reemplazan las de arriba con el mismo nombre.)
-- =====================================================================
alter table public.minume_codigos drop constraint if exists minume_codigos_nivel_check;
update public.minume_codigos set nivel = case when prefijo = 'CO' then 'coordinacion' else 'subdirector' end where nivel = 'direccion';
alter table public.minume_codigos add constraint minume_codigos_nivel_check check (nivel in ('voluntario', 'coordinacion', 'subdirector'));

create or replace function public.minume_es_admin(c public.minume_codigos) returns boolean
language sql immutable set search_path = public as $$ select c.sistema = 'coordinacion' or c.rol = 'coordinacion' or c.nivel in ('coordinacion', 'subdirector') $$;
create or replace function public.minume_es_prueba(c public.minume_codigos) returns boolean
language sql immutable set search_path = public as $$ select c.ref like 'demo-%' or c.creado_por = 'Prueba' $$;
revoke execute on function public.minume_es_admin(public.minume_codigos), public.minume_es_prueba(public.minume_codigos) from public, anon, authenticated;

create or replace function public.minume_guardar(p_token text, p_clave text, p_valor jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token); v jsonb; s text;
begin
  if p_clave !~ '^minume\.compartido\.[a-z0-9._-]{1,80}$' then raise exception 'Clave no permitida'; end if;
  if not public.minume_puede_leer(c.rol, c.sistema, p_clave) then raise exception 'Sin permiso para esta información' using errcode = '42501'; end if;
  if p_clave like 'minume.compartido.config.%' and not public.minume_es_admin(c) then raise exception 'Solo la coordinación o la subdirección editan los datos del evento' using errcode = '42501'; end if;
  s := substring(p_clave from '^minume\.compartido\.(?:diario|archivo\.reporte)\.([a-z]+)\.');
  if s is not null and s <> c.sistema and c.sistema <> 'coordinacion' then raise exception 'Esa bitácora es de otro equipo' using errcode = '42501'; end if;
  if p_clave like 'minume.compartido.archivo.reporte.%' and not public.minume_es_admin(c) then raise exception 'Solo la administración guarda reportes' using errcode = '42501'; end if;
  if p_valor is null then raise exception 'Valor vacío'; end if;
  if pg_column_size(p_valor) > 800000 then raise exception 'Demasiado grande'; end if;
  insert into public.minume_compartido as m (clave, valor, por, actualizado)
  values (p_clave, p_valor, left(c.nombre, 80), now())
  on conflict (clave) do update
    set valor = case when p_clave like 'minume.compartido.config.%' then excluded.valor else public.minume_fusion(m.valor, excluded.valor) end,
        por = excluded.por, actualizado = now()
  returning valor into v;
  perform realtime.send(jsonb_build_object('clave', p_clave), 'cambio', 'minume-compartido', false);
  return v;
end $function$;

create or replace function public.minume_codigos_lista(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general administra los códigos' using errcode = '42501'; end if;
  if public.minume_es_prueba(c) then raise exception 'Con un código de prueba no se administran códigos. Entra con tu código personal.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'ref', k.ref, 'prefijo', k.prefijo, 'nombre', k.nombre, 'rol', k.rol, 'sistema', k.sistema,
    'area', k.area, 'comision', k.comision, 'acr', k.acr, 'activo', k.activo, 'creado', k.creado, 'creado_por', k.creado_por, 'usado', k.usado, 'nivel', k.nivel, 'yo', k.id = c.id)
    order by k.activo desc, k.prefijo, k.nombre) from public.minume_codigos k), '[]'::jsonb);
end $function$;

create or replace function public.minume_codigo_crear(p_token text, p_prefijo text, p_nombre text, p_area text default null, p_comision text default null, p_acr text default null, p_nivel text default 'voluntario')
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token); t record; cod text; n public.minume_codigos; nv text;
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general crea códigos' using errcode = '42501'; end if;
  if public.minume_es_prueba(c) then raise exception 'Con un código de prueba no se crean códigos. Entra con tu código personal.' using errcode = '42501'; end if;
  select * into t from public.minume_tipo(upper(p_prefijo));
  if t.rol is null then raise exception 'Tipo de código no válido'; end if;
  if length(trim(coalesce(p_nombre, ''))) = 0 then raise exception 'Falta el nombre'; end if;
  nv := case when p_nivel in ('voluntario', 'coordinacion', 'subdirector') then p_nivel when p_nivel = 'direccion' then 'subdirector' else 'voluntario' end;
  if upper(p_prefijo) = 'CO' and nv = 'voluntario' then nv := 'coordinacion'; end if;
  if upper(p_prefijo) = 'CG' then nv := 'subdirector'; end if;
  cod := public.minume_generar_codigo(upper(p_prefijo));
  insert into public.minume_codigos (prefijo, hash, nombre, rol, sistema, area, comision, acr, creado_por, nivel)
  values (upper(p_prefijo), crypt(cod, gen_salt('bf', 8)), left(trim(p_nombre), 80), t.rol, t.sistema,
          case when t.rol = 'bienestar' then coalesce(nullif(p_area, ''), 'fisico') end,
          case when t.rol = 'asistencia' then nullif(left(trim(coalesce(p_comision, '')), 20), '') end,
          nullif(left(trim(coalesce(p_acr, '')), 20), ''), c.nombre, nv)
  returning * into n;
  return jsonb_build_object('codigo', cod, 'id', n.id, 'nombre', n.nombre, 'rol', n.rol, 'sistema', n.sistema, 'nivel', n.nivel);
end $function$;

create or replace function public.minume_codigo_nivel(p_token text, p_id bigint, p_nivel text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token); k public.minume_codigos;
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general cambia el nivel' using errcode = '42501'; end if;
  if public.minume_es_prueba(c) then raise exception 'Con un código de prueba no se cambian niveles. Entra con tu código personal.' using errcode = '42501'; end if;
  if p_nivel not in ('voluntario', 'coordinacion', 'subdirector') then raise exception 'Nivel no válido'; end if;
  if p_id = c.id then raise exception 'No puedes cambiar tu propio nivel'; end if;
  select * into k from public.minume_codigos where id = p_id; if not found then raise exception 'Ese código no existe'; end if;
  if k.prefijo = 'CG' then raise exception 'Coordinación general no cambia de nivel'; end if;
  if k.prefijo = 'CO' and p_nivel = 'voluntario' then raise exception 'Ese código siempre es de coordinación o subdirección'; end if;
  update public.minume_codigos set nivel = p_nivel where id = p_id;
  return jsonb_build_object('id', p_id, 'nivel', p_nivel);
end $function$;

create or replace function public.minume_codigo_activo(p_token text, p_id bigint, p_activo boolean)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema <> 'coordinacion' then raise exception 'Solo Coordinación general anula códigos' using errcode = '42501'; end if;
  if public.minume_es_prueba(c) then raise exception 'Con un código de prueba no se anulan códigos. Entra con tu código personal.' using errcode = '42501'; end if;
  if p_id = c.id and not p_activo then raise exception 'No puedes anular tu propio código'; end if;
  update public.minume_codigos set activo = p_activo where id = p_id;
  if not found then raise exception 'Ese código no existe'; end if;
  if not p_activo then delete from public.minume_sesiones where codigo_id = p_id; end if;
  return jsonb_build_object('id', p_id, 'activo', p_activo);
end $function$;

create or replace function public.minume_chat_canales(c public.minume_codigos)
 returns text[] language sql immutable set search_path to 'public' as $function$
  select case when c.sistema = 'coordinacion' then array['general','asistencia','seguridad','bienestar','eventos','coordinacion']
              when c.rol = 'coordinacion' or c.nivel in ('coordinacion', 'subdirector') then array['general', c.sistema, 'coordinacion']
              else array['general', c.sistema] end
$function$;

-- =====================================================================
-- 2026-10-25 · Avisos al teléfono (Web Push): los SOS, el nivel 3, los comunicados urgentes y los mensajes
-- urgentes del chat suenan aunque el teléfono esté bloqueado o la página cerrada.
-- Cómo funciona: cada teléfono que activa «Avisos al teléfono» guarda su suscripción (minume_push) con su sesión.
-- Cuando entra algo urgente, un disparador anota el aviso en la cola (minume_push_cola) con quién debe recibirlo
-- y llama a la Edge Function «minume-push» (supabase/functions/minume-push), que lo cifra y lo envía en paralelo.
-- Las llaves VAPID están en el Vault de Supabase (minume_vapid_publica y minume_vapid_privada), nunca en el código.
-- Para un proyecto nuevo: node herramientas/llaves_vapid.mjs, guardar lo que imprime con vault.create_secret,
-- poner la pública en armar.py (VAPID) y cambiar la dirección de la función en minume_push_encolar.
-- =====================================================================
create extension if not exists pg_net with schema extensions;

create table if not exists public.minume_push (
  id bigint generated always as identity primary key,
  codigo_id bigint not null references public.minume_codigos(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{16,32}$'),
  dispositivo text check (char_length(dispositivo) <= 60),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  ultimo_ok timestamptz,
  fallos int not null default 0
);
create index if not exists minume_push_codigo_idx on public.minume_push (codigo_id);

create table if not exists public.minume_push_cola (
  id bigint generated always as identity primary key,
  codigos bigint[] not null,               -- a quién va (códigos con teléfono suscrito)
  datos jsonb not null,                    -- título, texto, etiqueta y sección que se abre al tocarlo
  ttl int not null default 3600,           -- segundos que el servicio de push lo guarda si el teléfono está apagado
  enviar_desde timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'listo')),
  intentos int not null default 0,
  tomado timestamptz,
  creado timestamptz not null default now(),
  enviados int, fallidos int, error text
);
create index if not exists minume_push_cola_pendientes_idx on public.minume_push_cola (id) where estado <> 'listo';

alter table public.minume_push enable row level security;
alter table public.minume_push_cola enable row level security;
revoke all on public.minume_push, public.minume_push_cola from anon, authenticated;

-- Solo se aceptan direcciones de los servicios de push de los navegadores (así nadie usa la función para llamar a otro sitio)
create or replace function public.minume_push_valida(p_sub jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(p_sub->>'endpoint', '') ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)/'
     and char_length(p_sub->>'endpoint') <= 1000
     and coalesce(p_sub->'keys'->>'p256dh', '') ~ '^[A-Za-z0-9_-]{80,100}$'
     and coalesce(p_sub->'keys'->>'auth', '') ~ '^[A-Za-z0-9_-]{16,32}$'
$$;

-- El teléfono se suscribe (o cambia de código): una fila por teléfono; máximo 10 teléfonos por código
create or replace function public.minume_push_suscribir(p_token text, p_sub jsonb, p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); n int;
begin
  if not public.minume_push_valida(p_sub) then raise exception 'Suscripción no válida'; end if;
  insert into public.minume_push (codigo_id, endpoint, p256dh, auth, dispositivo)
  values (c.id, p_sub->>'endpoint', p_sub->'keys'->>'p256dh', p_sub->'keys'->>'auth', left(p_dispositivo, 60))
  on conflict (endpoint) do update set codigo_id = excluded.codigo_id, p256dh = excluded.p256dh, auth = excluded.auth,
    dispositivo = excluded.dispositivo, actualizado = now(), fallos = 0;
  delete from public.minume_push where id in (select id from public.minume_push where codigo_id = c.id order by actualizado desc offset 10);
  select count(*) into n from public.minume_push where codigo_id = c.id;
  return jsonb_build_object('ok', true, 'telefonos', n);
end $$;

create or replace function public.minume_push_quitar(p_token text, p_endpoint text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  delete from public.minume_push where endpoint = p_endpoint and codigo_id = c.id;
end $$;

-- El navegador renovó la suscripción por su cuenta (pasa poco): la dirección vieja prueba que es el mismo teléfono
create or replace function public.minume_push_cambio(p_viejo text, p_sub jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.minume_push_valida(p_sub) then return; end if;
  update public.minume_push set endpoint = p_sub->>'endpoint', p256dh = p_sub->'keys'->>'p256dh', auth = p_sub->'keys'->>'auth',
    actualizado = now(), fallos = 0
  where endpoint = p_viejo and not exists (select 1 from public.minume_push x where x.endpoint = p_sub->>'endpoint');
end $$;

-- Anota un aviso en la cola y despierta a la Edge Function (pg_net la llama al terminar la transacción, sin hacer esperar a nadie)
create or replace function public.minume_push_encolar(p_codigos bigint[], p_datos jsonb, p_ttl int default 3600, p_desde timestamptz default now())
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if coalesce(cardinality(p_codigos), 0) = 0 then return; end if;
  insert into public.minume_push_cola (codigos, datos, ttl, enviar_desde) values (p_codigos, p_datos, p_ttl, p_desde);
  perform net.http_post(url := 'https://fakkqpwgidjvodippxup.supabase.co/functions/v1/minume-push',
    body := '{}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 5000);
end $$;

-- «Probar»: en 10 segundos le llega un aviso de prueba a cada teléfono de ese código (máximo 3 cada 5 minutos)
create or replace function public.minume_push_probar(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); n int;
begin
  select count(*) into n from public.minume_push where codigo_id = c.id;
  if n = 0 then return jsonb_build_object('telefonos', 0); end if;
  if (select count(*) from public.minume_push_cola where codigos = array[c.id] and datos->>'tipo' = 'prueba' and creado > now() - interval '5 minutes') >= 3 then
    raise exception 'Ya hiciste varias pruebas: espera unos minutos';
  end if;
  perform public.minume_push_encolar(array[c.id], jsonb_build_object('tipo', 'prueba', 'sos', true, 'tag', 'minume-prueba', 'sec', '',
    't', '🔔 Prueba de avisos MINUME', 'b', 'Si ves esto con el teléfono bloqueado, los SOS y los urgentes te van a llegar.'), 120, now() + interval '10 seconds');
  return jsonb_build_object('telefonos', n);
end $$;

-- ---------- Lo que usa la Edge Function (solo con la llave de servicio) ----------
create or replace function public.minume_push_llaves() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'publica', (select decrypted_secret from vault.decrypted_secrets where name = 'minume_vapid_publica'),
    'privada', (select decrypted_secret from vault.decrypted_secrets where name = 'minume_vapid_privada'),
    'sub', 'https://minume-xvii.vercel.app')
$$;

-- Toma hasta p_limite avisos pendientes (los que otra llamada ya tomó se saltan) con los teléfonos a los que van
create or replace function public.minume_push_tomar(p_limite int default 25) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  with t as (
    select id from public.minume_push_cola
     where (estado = 'pendiente' or (estado = 'enviando' and tomado < now() - interval '2 minutes' and intentos < 3))
       and creado > now() - interval '30 minutes' and enviar_desde <= now() + interval '25 seconds'
     order by id limit least(greatest(p_limite, 1), 100) for update skip locked),
  q as (
    update public.minume_push_cola c set estado = 'enviando', tomado = now(), intentos = c.intentos + 1
      from t where c.id = t.id returning c.id, c.codigos, c.datos, c.ttl, c.enviar_desde)
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'datos', q.datos, 'ttl', q.ttl, 'desde', q.enviar_desde,
    'subs', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth, 'sistema', k.sistema))
                        from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                       where p.codigo_id = any(q.codigos) and k.activo), '[]'::jsonb)) order by q.id), '[]'::jsonb)
    into r from q;
  return r;
end $$;

-- Resultado de un aviso: los teléfonos que ya no existen se borran; los que fallan 5 veces seguidas, también
create or replace function public.minume_push_listo(p_id bigint, p_buenos bigint[], p_malos bigint[], p_borrar bigint[], p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.minume_push_cola set estado = 'listo', enviados = cardinality(p_buenos), fallidos = cardinality(p_malos) + cardinality(p_borrar),
    error = left(p_error, 300) where id = p_id;
  if cardinality(p_borrar) > 0 then delete from public.minume_push where id = any(p_borrar); end if;
  if cardinality(p_buenos) > 0 then
    update public.minume_push set fallos = 0, ultimo_ok = now()
     where id = any(p_buenos) and (fallos > 0 or ultimo_ok is null or ultimo_ok < now() - interval '10 minutes');
  end if;
  if cardinality(p_malos) > 0 then
    update public.minume_push set fallos = fallos + 1 where id = any(p_malos);
    delete from public.minume_push where id = any(p_malos) and fallos >= 5;
  end if;
  delete from public.minume_push_cola where creado < now() - interval '3 days';
end $$;

-- ---------- Disparadores ----------
-- SOS y nivel 3 (avisos) y comunicados urgentes: solo cuentan los elementos nuevos (se compara con lo que había)
create or replace function public.minume_push_compartido() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare a jsonb; ids bigint[]; ya bigint[] := '{}'; viejos text[] := '{}'; lugar text; sos boolean;
begin
  if jsonb_typeof(new.valor) <> 'array' then return null; end if;
  if tg_op = 'UPDATE' and jsonb_typeof(old.valor) = 'array' then
    viejos := array(select e->>'id' from jsonb_array_elements(old.valor) e where jsonb_typeof(e) = 'object' and e ? 'id');
  end if;
  for a in select e from jsonb_array_elements(new.valor) e where jsonb_typeof(e) = 'object' and e ? 'id' and not ((e->>'id') = any(viejos)) loop
    if new.clave = 'minume.compartido.avisos' then
      sos := coalesce(a->>'tipo', '') ~* '^SOS';
      continue when not (sos or coalesce(a->>'tipo', '') ~ '^Nivel 3') or coalesce(a->>'estado', 'nuevo') in ('resuelto', 'derivado');
      continue when (a->>'t') ~ '^\d+$' and (a->>'t')::numeric < extract(epoch from now()) * 1000 - 6 * 3600 * 1000;   -- llegó horas tarde (sin internet)
      -- Un mismo SOS va a varios equipos: a coordinación le llega una sola vez
      ids := array(select distinct p.codigo_id from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                    where k.activo and (k.sistema = a->>'para' or k.sistema = 'coordinacion') and k.nombre is distinct from a->>'por'
                      and not (p.codigo_id = any(ya)));
      ya := ya || ids;
      lugar := coalesce('Salón ' || nullif(a->>'salon', ''), nullif(a->>'donde', ''), nullif(a->>'sede', ''), 'Lugar sin indicar');
      perform public.minume_push_encolar(ids, jsonb_build_object('tipo', 'sos', 'sos', true, 'sec', '', 'tag', 'sos-' || (a->>'id'),
        't', case when sos then '🚨 SOS · ' || regexp_replace(a->>'tipo', '^SOS · ', '') else '⚠️ ' || (a->>'tipo') end,
        'b', left(lugar || coalesce(' · ' || nullif(a->>'comision', ''), '') || ' · Enviado por ' || coalesce(nullif(a->>'por', ''), '—'), 240)), 900);
    elsif new.clave = 'minume.compartido.comunicados' then
      continue when coalesce(a->>'tipo', '') <> 'urgente';
      ids := array(select distinct p.codigo_id from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                    where k.activo and (a->>'para' = 'todos' or k.sistema = a->>'para' or k.sistema = 'coordinacion')
                      and ('r:' || k.ref) is distinct from a->>'deCod');
      perform public.minume_push_encolar(ids, jsonb_build_object('tipo', 'comunicado', 'sos', true, 'sec', 'comunicados', 'tag', 'com-' || (a->>'id'),
        't', '📢 Comunicado urgente' || coalesce(' · ' || nullif(a->>'de', ''), ''), 'b', left(coalesce(a->>'texto', ''), 240)), 3600);
    end if;
  end loop;
  return null;
end $$;

drop trigger if exists minume_push_compartido on public.minume_compartido;
create trigger minume_push_compartido after insert or update of valor on public.minume_compartido
  for each row when (new.clave in ('minume.compartido.avisos', 'minume.compartido.comunicados'))
  execute function public.minume_push_compartido();

-- Mensajes urgentes del chat: a todos los que tienen ese canal, menos a quien lo escribió
create or replace function public.minume_push_chat() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare ids bigint[];
begin
  ids := array(select distinct p.codigo_id from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                where k.activo and k.id <> new.codigo_id and new.canal = any(public.minume_chat_canales(k)));
  perform public.minume_push_encolar(ids, jsonb_build_object('tipo', 'chat', 'sos', false, 'sec', 'chat', 'tag', 'chat-' || new.id,
    't', '🚨 Urgente en el chat · ' || case new.canal when 'general' then 'General' when 'asistencia' then 'Asistencia' when 'seguridad' then 'Seguridad'
      when 'bienestar' then 'Bienestar' when 'eventos' then 'Eventos' else 'Coordinación' end,
    'b', left(new.nombre || ': ' || new.texto, 240)), 1800);
  return null;
end $$;

drop trigger if exists minume_push_chat on public.minume_chat;
create trigger minume_push_chat after insert on public.minume_chat for each row when (new.urgente) execute function public.minume_push_chat();

revoke all on function public.minume_push_valida(jsonb), public.minume_push_encolar(bigint[], jsonb, int, timestamptz),
  public.minume_push_llaves(), public.minume_push_tomar(int), public.minume_push_listo(bigint, bigint[], bigint[], bigint[], text),
  public.minume_push_compartido(), public.minume_push_chat() from public, anon, authenticated;
grant execute on function public.minume_push_llaves(), public.minume_push_tomar(int), public.minume_push_listo(bigint, bigint[], bigint[], bigint[], text) to service_role;
revoke all on function public.minume_push_suscribir(text, jsonb, text), public.minume_push_quitar(text, text), public.minume_push_cambio(text, jsonb),
  public.minume_push_probar(text) from public;
grant execute on function public.minume_push_suscribir(text, jsonb, text), public.minume_push_quitar(text, text), public.minume_push_cambio(text, jsonb),
  public.minume_push_probar(text) to anon, authenticated;

-- =====================================================================
-- 2026-10-25 · «Mi subdirección»: la subdirección o la coordinación de cada equipo ve SU staff
-- (solo lectura: nombre, rol, nivel, actividad de hoy y si tiene los avisos al teléfono). Nadie ve otro equipo.
-- =====================================================================
create or replace function public.minume_mi_equipo(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); d date := (now() at time zone 'America/Santo_Domingo')::date;
begin
  if not public.minume_es_admin(c) then raise exception 'Solo la coordinación o la subdirección ven su equipo' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('ref', k.ref, 'nombre', k.nombre, 'rol', k.rol, 'nivel', k.nivel, 'area', k.area,
      'comision', k.comision, 'usado', k.usado, 'ultima', a.ultima, 'minutos', coalesce(a.minutos, 0),
      'avisos', exists (select 1 from public.minume_push p where p.codigo_id = k.id), 'prueba', public.minume_es_prueba(k), 'yo', k.id = c.id)
      order by k.rol, k.nombre)
    from public.minume_codigos k left join public.minume_actividad a on a.codigo_id = k.id and a.dia = d
    where k.activo and k.sistema = c.sistema), '[]'::jsonb);
end $$;
revoke all on function public.minume_mi_equipo(text) from public;
grant execute on function public.minume_mi_equipo(text) to anon, authenticated;

-- =====================================================================
-- 2026-10-25 · «Mandar a su gente»: la subdirección o coordinación de un equipo manda a una persona de su staff.
-- La orden viaja en la clave «minume.compartido.ordenes» y le suena a esa persona en el teléfono (Web Push).
-- Solo suena si quien la manda es administración de ese mismo equipo (o Coordinación general).
-- (Esta definición reemplaza la de minume_push_compartido de arriba.)
-- =====================================================================
create or replace function public.minume_push_compartido() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare a jsonb; ids bigint[]; ya bigint[] := '{}'; viejos text[] := '{}'; lugar text; sos boolean; jefe public.minume_codigos;
begin
  if jsonb_typeof(new.valor) <> 'array' then return null; end if;
  if tg_op = 'UPDATE' and jsonb_typeof(old.valor) = 'array' then
    viejos := array(select e->>'id' from jsonb_array_elements(old.valor) e where jsonb_typeof(e) = 'object' and e ? 'id');
  end if;
  for a in select e from jsonb_array_elements(new.valor) e where jsonb_typeof(e) = 'object' and e ? 'id' and not ((e->>'id') = any(viejos)) loop
    if new.clave = 'minume.compartido.avisos' then
      sos := coalesce(a->>'tipo', '') ~* '^SOS';
      continue when not (sos or coalesce(a->>'tipo', '') ~ '^Nivel 3') or coalesce(a->>'estado', 'nuevo') in ('resuelto', 'derivado');
      continue when (a->>'t') ~ '^\d+$' and (a->>'t')::numeric < extract(epoch from now()) * 1000 - 6 * 3600 * 1000;
      ids := array(select distinct p.codigo_id from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                    where k.activo and (k.sistema = a->>'para' or k.sistema = 'coordinacion') and k.nombre is distinct from a->>'por'
                      and not (p.codigo_id = any(ya)));
      ya := ya || ids;
      lugar := coalesce('Salón ' || nullif(a->>'salon', ''), nullif(a->>'donde', ''), nullif(a->>'sede', ''), 'Lugar sin indicar');
      perform public.minume_push_encolar(ids, jsonb_build_object('tipo', 'sos', 'sos', true, 'sec', '', 'tag', 'sos-' || (a->>'id'),
        't', case when sos then '🚨 SOS · ' || regexp_replace(a->>'tipo', '^SOS · ', '') else '⚠️ ' || (a->>'tipo') end,
        'b', left(lugar || coalesce(' · ' || nullif(a->>'comision', ''), '') || ' · Enviado por ' || coalesce(nullif(a->>'por', ''), '—'), 240)), 900);
    elsif new.clave = 'minume.compartido.comunicados' then
      continue when coalesce(a->>'tipo', '') <> 'urgente';
      ids := array(select distinct p.codigo_id from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                    where k.activo and (a->>'para' = 'todos' or k.sistema = a->>'para' or k.sistema = 'coordinacion')
                      and ('r:' || k.ref) is distinct from a->>'deCod');
      perform public.minume_push_encolar(ids, jsonb_build_object('tipo', 'comunicado', 'sos', true, 'sec', 'comunicados', 'tag', 'com-' || (a->>'id'),
        't', '📢 Comunicado urgente' || coalesce(' · ' || nullif(a->>'de', ''), ''), 'b', left(coalesce(a->>'texto', ''), 240)), 3600);
    elsif new.clave = 'minume.compartido.ordenes' then
      continue when coalesce(a->>'estado', 'nueva') <> 'nueva';
      select * into jefe from public.minume_codigos where ref = a->>'deRef' and activo;
      continue when jefe.id is null or not public.minume_es_admin(jefe);
      ids := array(select distinct p.codigo_id from public.minume_push p join public.minume_codigos k on k.id = p.codigo_id
                    where k.activo and k.ref = a->>'para' and (k.sistema = jefe.sistema or jefe.sistema = 'coordinacion'));
      perform public.minume_push_encolar(ids, jsonb_build_object('tipo', 'orden', 'sos', true, 'sec', '', 'tag', 'ord-' || (a->>'id'),
        't', '📣 ' || coalesce(nullif(split_part(jefe.nombre, ' ', 1), ''), 'Tu subdirección') || ' te manda', 'b', left(coalesce(a->>'que', ''), 240)), 1800);
    end if;
  end loop;
  return null;
end $$;

drop trigger if exists minume_push_compartido on public.minume_compartido;
create trigger minume_push_compartido after insert or update of valor on public.minume_compartido
  for each row when (new.clave in ('minume.compartido.avisos', 'minume.compartido.comunicados', 'minume.compartido.ordenes'))
  execute function public.minume_push_compartido();
revoke all on function public.minume_push_compartido() from public, anon, authenticated;

-- =====================================================================
-- 2026-10-25 · Fotos de los invitados especiales (Eventos y Protocolo)
-- Van en su propia tabla y solo se descargan cuando alguien abre «Invitados» (no con el resto de los datos).
-- La página las achica antes de subirlas (JPEG de unos 30 KB). Las suben Eventos y Protocolo y Coordinación general.
-- =====================================================================
create table if not exists public.minume_fotos (
  clave text primary key check (clave ~ '^[a-z0-9._-]{1,80}$'),
  data text not null check (data like 'data:image/jpeg;base64,%' and char_length(data) <= 200000),
  por text,
  actualizado timestamptz not null default now()
);
alter table public.minume_fotos enable row level security;
revoke all on public.minume_fotos from anon, authenticated;

create or replace function public.minume_foto_guardar(p_token text, p_clave text, p_data text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); v timestamptz;
begin
  if c.sistema not in ('eventos', 'coordinacion') then raise exception 'Solo Eventos y Protocolo o Coordinación general suben fotos' using errcode = '42501'; end if;
  if p_clave !~ '^inv\.[a-z0-9_-]{1,60}$' then raise exception 'Clave no permitida'; end if;
  if p_data is null or p_data not like 'data:image/jpeg;base64,%' or char_length(p_data) > 200000 then raise exception 'La foto no es válida o es muy grande'; end if;
  insert into public.minume_fotos (clave, data, por, actualizado) values (p_clave, p_data, left(c.nombre, 80), now())
  on conflict (clave) do update set data = excluded.data, por = excluded.por, actualizado = now() returning actualizado into v;
  perform realtime.send(jsonb_build_object('clave', p_clave), 'foto', 'minume-compartido', false);
  return jsonb_build_object('clave', p_clave, 'actualizado', v);
end $$;

create or replace function public.minume_foto_borrar(p_token text, p_clave text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if c.sistema not in ('eventos', 'coordinacion') then raise exception 'Solo Eventos y Protocolo o Coordinación general quitan fotos' using errcode = '42501'; end if;
  delete from public.minume_fotos where clave = p_clave;
  perform realtime.send(jsonb_build_object('clave', p_clave), 'foto', 'minume-compartido', false);
end $$;

-- Lee solo las fotos que se piden (máximo 40 a la vez); las que no existen no vienen
create or replace function public.minume_foto_leer(p_token text, p_claves text[])
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  return coalesce((select jsonb_object_agg(f.clave, f.data) from public.minume_fotos f
                   where f.clave = any(p_claves[1:40])), '{}'::jsonb);
end $$;

revoke all on function public.minume_foto_guardar(text, text, text), public.minume_foto_borrar(text, text), public.minume_foto_leer(text, text[]) from public;
grant execute on function public.minume_foto_guardar(text, text, text), public.minume_foto_borrar(text, text), public.minume_foto_leer(text, text[]) to anon, authenticated;

-- =====================================================================
-- Fotos de Bienestar para el expediente (clave bie.<id del caso>)
-- Las suben Bienestar y Coordinación general; solo ellos las pueden ver. Las de invitados (inv.*) siguen igual.
-- =====================================================================
create or replace function public.minume_foto_permiso(c public.minume_codigos, p_clave text) returns boolean
language sql stable set search_path = public as $$
  select case
    when p_clave ~ '^inv\.[a-z0-9_-]{1,60}$' then c.sistema in ('eventos', 'coordinacion')
    when p_clave ~ '^bie\.[a-z0-9_-]{1,60}$' then c.rol = 'bienestar' or c.sistema = 'coordinacion'
    else false end
$$;

create or replace function public.minume_foto_guardar(p_token text, p_clave text, p_data text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token); v timestamptz;
begin
  if not public.minume_foto_permiso(c, p_clave) then raise exception 'No puedes subir esta foto' using errcode = '42501'; end if;
  if p_data is null or p_data not like 'data:image/jpeg;base64,%' or char_length(p_data) > 200000 then raise exception 'La foto no es válida o es muy grande'; end if;
  insert into public.minume_fotos (clave, data, por, actualizado) values (p_clave, p_data, left(c.nombre, 80), now())
  on conflict (clave) do update set data = excluded.data, por = excluded.por, actualizado = now() returning actualizado into v;
  perform realtime.send(jsonb_build_object('clave', p_clave), 'foto', 'minume-compartido', false);
  return jsonb_build_object('clave', p_clave, 'actualizado', v);
end $$;

create or replace function public.minume_foto_borrar(p_token text, p_clave text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  if not public.minume_foto_permiso(c, p_clave) then raise exception 'No puedes quitar esta foto' using errcode = '42501'; end if;
  delete from public.minume_fotos where clave = p_clave;
  perform realtime.send(jsonb_build_object('clave', p_clave), 'foto', 'minume-compartido', false);
end $$;

-- Las de invitados las ve todo el staff; las de Bienestar, solo Bienestar y Coordinación general
create or replace function public.minume_foto_leer(p_token text, p_claves text[])
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare c public.minume_codigos := public.minume_sesion(p_token);
begin
  return coalesce((select jsonb_object_agg(f.clave, f.data) from public.minume_fotos f
                   where f.clave = any(p_claves[1:40])
                     and (f.clave like 'inv.%' or (f.clave like 'bie.%' and (c.rol = 'bienestar' or c.sistema = 'coordinacion')))), '{}'::jsonb);
end $$;

revoke all on function public.minume_foto_permiso(public.minume_codigos, text) from public, anon, authenticated;
