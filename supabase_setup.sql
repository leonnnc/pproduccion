-- ====================================================================
-- SCRIPT DE BASE DE DATOS PARA SUPABASE - PRODUCCION
-- COPIAR Y PEGAR EN EL SQL EDITOR DE SUPABASE
-- ====================================================================

-- LIMPIEZA PREVIA (Para evitar errores si se ejecuta más de una vez)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_superleader(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_leader_or_above(UUID) CASCADE;

DROP TABLE IF EXISTS public.disponibilidad CASCADE;
DROP TABLE IF EXISTS public.asignaciones CASCADE;
DROP TABLE IF EXISTS public.eventos CASCADE;
DROP TABLE IF EXISTS public.miembros_areas CASCADE;
DROP TABLE IF EXISTS public.areas CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

DROP TYPE IF EXISTS public.estado_confirmacion CASCADE;
DROP TYPE IF EXISTS public.tipo_servicio CASCADE;
DROP TYPE IF EXISTS public.tipo_rol CASCADE;

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear ENUMS y TABLAS
CREATE TYPE public.tipo_rol AS ENUM ('superadmin', 'superleader', 'leader', 'coleader', 'servant');
CREATE TYPE public.tipo_servicio AS ENUM ('domingo_8am', 'domingo_11am', 'domingo_1pm', 'domingo_7pm', 'miercoles_730pm', 'especial');
CREATE TYPE public.estado_confirmacion AS ENUM ('pendiente', 'confirmado', 'rechazado');

-- TABLA: USUARIOS (Datos de perfil público vinculados a Auth de Supabase)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    distrito VARCHAR(100),
    rol public.tipo_rol DEFAULT 'servant'::public.tipo_rol NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA: AREAS
CREATE TABLE public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA: MIEMBROS_AREAS (Relación muchos-a-muchos)
CREATE TABLE public.miembros_areas (
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
    es_lider_principal BOOLEAN DEFAULT false NOT NULL,
    PRIMARY KEY (usuario_id, area_id)
);

-- TABLA: EVENTOS
CREATE TABLE public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo public.tipo_servicio NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    descripcion TEXT,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA: ASIGNACIONES
CREATE TABLE public.asignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE NOT NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
    rol_en_evento VARCHAR(100) DEFAULT 'Siervo' NOT NULL,
    estado public.estado_confirmacion DEFAULT 'pendiente'::public.estado_confirmacion NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unica_asignacion_usuario_evento UNIQUE(evento_id, usuario_id)
);

-- TABLA: DISPONIBILIDAD (Calendario donde agendan días)
CREATE TABLE public.disponibilidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL,
    turno public.tipo_servicio NOT NULL,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unica_disponibilidad_dia UNIQUE(usuario_id, fecha, turno)
);

-- ====================================================================
-- 3. TRIGGERS PARA VINCULAR AUTOMÁTICAMENTE EL REGISTRO
-- ====================================================================


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_rol public.tipo_rol := 'servant'::public.tipo_rol;
    is_first_user boolean;
    area_uuid uuid;
    area_nombre text;
BEGIN
    -- Comprobar si es el primer usuario del sistema para hacerlo superadmin automáticamente (invisible y total control)
    SELECT NOT EXISTS (SELECT 1 FROM public.usuarios) INTO is_first_user;
    
    IF is_first_user THEN
        default_rol := 'superadmin'::public.tipo_rol;
    END IF;

    INSERT INTO public.usuarios (id, email, nombre_completo, rol, telefono, distrito)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Siervo'),
        default_rol,
        new.raw_user_meta_data->>'telefono',
        new.raw_user_meta_data->>'distrito'
    );

    -- Si se seleccionó una área inicial, inscribir al usuario en ella automáticamente
    area_nombre := new.raw_user_meta_data->>'area_inicial';
    IF area_nombre IS NOT NULL AND area_nombre <> '' THEN
        SELECT id INTO area_uuid FROM public.areas WHERE nombre = area_nombre;
        
        IF area_uuid IS NOT NULL THEN
            INSERT INTO public.miembros_areas (usuario_id, area_id, es_lider_principal)
            VALUES (new.id, area_uuid, false)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función al insertar en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 4. HABILITAR SEGURIDAD ENCAPSULADA (ROW LEVEL SECURITY - RLS)
-- ====================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. FUNCIONES AUXILIARES PARA POLÍTICAS DE RLS
-- ====================================================================

-- Función para verificar si un usuario es líder o superior (SuperAdmin, SuperLíder, Líder, Co-Líder)
CREATE OR REPLACE FUNCTION public.is_leader_or_above(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = user_id AND rol IN ('superadmin'::public.tipo_rol, 'superleader'::public.tipo_rol, 'leader'::public.tipo_rol, 'coleader'::public.tipo_rol)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 6. POLÍTICAS DE SEGURIDAD (RLS POLICIES)
-- ====================================================================

-- --- TABLA: USUARIOS ---
CREATE POLICY "Lectura: Todos los autenticados pueden ver usuarios"
    ON public.usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Modificación: Los usuarios se modifican a sí mismos"
    ON public.usuarios FOR UPDATE TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Administración total: Solo Superadmins y Líderes"
    ON public.usuarios FOR ALL TO authenticated 
    USING (public.is_leader_or_above(auth.uid()));

-- --- TABLA: AREAS ---
CREATE POLICY "Lectura: Todos pueden ver áreas"
    ON public.areas FOR SELECT USING (true);

CREATE POLICY "Escritura: Solo Superadmins y Líderes"
    ON public.areas FOR ALL TO authenticated 
    USING (public.is_leader_or_above(auth.uid()));

-- --- TABLA: MIEMBROS_AREAS ---
CREATE POLICY "Lectura: Todos los autenticados pueden ver miembros de áreas"
    ON public.miembros_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura: Solo Líderes o Superiores"
    ON public.miembros_areas FOR ALL TO authenticated 
    USING (public.is_leader_or_above(auth.uid()));

-- --- TABLA: EVENTOS ---
CREATE POLICY "Lectura: Todos los autenticados pueden ver eventos"
    ON public.eventos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura: Solo Líderes o Superiores"
    ON public.eventos FOR ALL TO authenticated 
    USING (public.is_leader_or_above(auth.uid()));

-- --- TABLA: ASIGNACIONES ---
CREATE POLICY "Lectura: Todos los autenticados pueden ver asignaciones"
    ON public.asignaciones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura: Solo Líderes o Superiores"
    ON public.asignaciones FOR ALL TO authenticated 
    USING (public.is_leader_or_above(auth.uid()));

CREATE POLICY "Confirmar: El siervo asignado puede confirmar o rechazar su puesto"
    ON public.asignaciones FOR UPDATE TO authenticated 
    USING (auth.uid() = usuario_id) 
    WITH CHECK (auth.uid() = usuario_id);

-- --- TABLA: DISPONIBILIDAD ---
CREATE POLICY "Lectura: Siervos ven su propia disponibilidad. Líderes ven todo."
    ON public.disponibilidad FOR SELECT TO authenticated 
    USING (auth.uid() = usuario_id OR public.is_leader_or_above(auth.uid()));

CREATE POLICY "Escritura: Siervos gestionan su propia disponibilidad"
    ON public.disponibilidad FOR ALL TO authenticated 
    USING (auth.uid() = usuario_id) 
    WITH CHECK (auth.uid() = usuario_id);

-- ====================================================================
-- 7. SEMILLAS (SEED DATA) DE AREAS PREDETERMINADAS
-- ====================================================================
INSERT INTO public.areas (nombre, descripcion) VALUES
('Cámaras', 'Operación de cámaras de video profesionales fijas y móviles.'),
('Switchers', 'Dirección de ponchado de video, mezcla de cámaras y transmisión.')
ON CONFLICT (nombre) DO NOTHING;
