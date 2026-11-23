-- IanaMed · Sprint 1 · Modelo base: usuarios, pacientes y bitácora NOM-024 (HU-01, HU-02, HU-03).

CREATE TABLE IF NOT EXISTS usuarios (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(60)  NOT NULL UNIQUE,
  cedula     VARCHAR(20)  UNIQUE,
  nombre     VARCHAR(120) NOT NULL,
  role       VARCHAR(20)  NOT NULL CHECK (role IN ('adscrito', 'residente', 'mip', 'recepcion', 'admin')),
  hash       TEXT         NOT NULL CHECK (hash LIKE '$argon2id$%'),
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Expediente consecutivo: EXP-AAAA-0001, generado por una secuencia (seguro con altas concurrentes).
CREATE SEQUENCE IF NOT EXISTS expediente_seq START 1;

CREATE TABLE IF NOT EXISTS pacientes (
  id          SERIAL PRIMARY KEY,
  expediente  VARCHAR(20)  NOT NULL UNIQUE
              DEFAULT ('EXP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('expediente_seq')::text, 4, '0')),
  curp        CHAR(18)     NOT NULL UNIQUE,
  nombre      VARCHAR(120) NOT NULL,
  sexo        CHAR(1)      CHECK (sexo IN ('H', 'M')),
  telefono    VARCHAR(20),
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pacientes_nombre_idx ON pacientes (lower(nombre));

-- Bitácora NOM-024: solo inserción. Sin contraseñas ni datos clínicos (lo garantiza AuditoriaService).
CREATE TABLE IF NOT EXISTS auditoria_nom024 (
  id          BIGSERIAL PRIMARY KEY,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id  VARCHAR(40),
  rol         VARCHAR(20),
  ip          VARCHAR(45) NOT NULL,
  accion      VARCHAR(40) NOT NULL,
  detalle     JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'auditoria_nom024 es de solo inserción (NOM-024): % prohibido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditoria_sin_update_delete ON auditoria_nom024;
CREATE TRIGGER auditoria_sin_update_delete
  BEFORE UPDATE OR DELETE ON auditoria_nom024
  FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();

-- TRUNCATE no dispara triggers de fila: también se bloquea.
DROP TRIGGER IF EXISTS auditoria_sin_truncate ON auditoria_nom024;
CREATE TRIGGER auditoria_sin_truncate
  BEFORE TRUNCATE ON auditoria_nom024
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_inmutable();

-- Usuario de la aplicación: puede insertar y leer la bitácora, nunca modificarla.
-- Su contraseña no vive en el repositorio: migrate.js la asigna desde APP_DB_PASSWORD.
-- Si el proveedor no permite crear roles, la app usa el usuario dueño y el trigger sigue bloqueando UPDATE/DELETE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ianamed_app') THEN
    BEGIN
      CREATE ROLE ianamed_app LOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sin permiso para crear el rol ianamed_app; se omite.';
    END;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ianamed_app') THEN
    GRANT SELECT, INSERT, UPDATE ON usuarios, pacientes TO ianamed_app;
    GRANT SELECT, INSERT ON auditoria_nom024 TO ianamed_app;
    REVOKE UPDATE, DELETE, TRUNCATE ON auditoria_nom024 FROM ianamed_app;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ianamed_app;
  END IF;
END $$;
