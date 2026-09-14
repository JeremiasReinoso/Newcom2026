-- Fuente central de licencias NEWCOM. Ejecutar en el SQL Editor del proyecto
-- Supabase antes de configurar NEWCOM_CONFIG en el hosting.
create table if not exists public.licencias (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique check (codigo ~ '^NWC-[A-Z0-9]+(-[A-Z0-9]+)+$'),
    cliente text not null,
    email text not null default '',
    cupo_total integer not null check (cupo_total >= 0),
    cupo_utilizado integer not null default 0 check (cupo_utilizado >= 0 and cupo_utilizado <= cupo_total),
    activa boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Una licencia permanente mantiene su código; sumar compras incrementa sólo
-- cupo_total. La operación de consumo es atómica para evitar doble uso.
create or replace function public.consumir_credito_licencia(p_codigo text)
returns public.licencias
language plpgsql
security definer
set search_path = public
as $$
declare resultado public.licencias;
begin
    update public.licencias
       set cupo_utilizado = cupo_utilizado + 1,
           updated_at = now()
     where codigo = upper(trim(p_codigo))
       and activa = true
       and cupo_utilizado < cupo_total
     returning * into resultado;
    if resultado.id is null then
        raise exception 'LICENSE_CREDIT_UNAVAILABLE';
    end if;
    return resultado;
end;
$$;

create or replace function public.agregar_creditos_licencia(p_licencia_id uuid, p_cantidad integer)
returns public.licencias
language plpgsql
security definer
set search_path = public
as $$
declare resultado public.licencias;
begin
    if p_cantidad is null or p_cantidad < 1 then
        raise exception 'INVALID_CREDIT_AMOUNT';
    end if;
    update public.licencias
       set cupo_total = cupo_total + p_cantidad,
           updated_at = now()
     where id = p_licencia_id
     returning * into resultado;
    if resultado.id is null then
        raise exception 'LICENSE_NOT_FOUND';
    end if;
    return resultado;
end;
$$;
