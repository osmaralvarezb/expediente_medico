-- IanaMed · Sprint 2 · Datos clínicos cifrados en reposo (HU-04) y rol de Enfermería (HU-05).

-- Antecedentes y diagnóstico se guardan solo cifrados con AES-256-GCM (iv.tag.cifrado en base64).
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS antecedentes_cifrado TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS diagnostico_cifrado TEXT;

-- La tabla usuarios acepta el nuevo rol enfermeria.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('adscrito', 'residente', 'mip', 'recepcion', 'admin', 'enfermeria'));
