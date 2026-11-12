// Matriz RBAC (ver especificación §2). Pura, sin dependencias del navegador, para poder probarla con Node.
export const ROLES = {
  adscrito: 'Médico Adscrito',
  residente: 'Médico Residente',
  mip: 'Interno / Pasante (MIP·MPSS)',
  recepcion: 'Recepción',
  admin: 'Administrador TI',
  // QFB / Químico Clínico realiza y valida los análisis; técnico y médico radiólogo toman e interpretan la imagen.
  laboratorio: 'Laboratorio clínico (QFB)',
  imagenologia: 'Imagenología (Radiología)',
};

const PERMS = {
  adscrito: ['patients:read', 'patients:create', 'patients:update', 'clinical:read', 'clinical:write', 'history:write', 'diagnosis:write', 'notes:sign', 'notes:approve', 'notes:reject', 'pdf:clinical', 'studies:request', 'studies:deliver', 'studies:cancel'],
  residente: ['patients:read', 'patients:create', 'patients:update', 'clinical:read', 'clinical:write', 'history:write', 'diagnosis:write', 'notes:sign', 'notes:approve', 'pdf:clinical', 'studies:request', 'studies:deliver', 'studies:cancel'],
  mip: ['patients:read', 'clinical:read', 'clinical:write'],
  recepcion: ['patients:read', 'patients:create', 'patients:update', 'pdf:demographic', 'studies:deliver'],
  admin: ['audit:read', 'users:read', 'users:manage'],
  // Mínimo privilegio: solo su lista de trabajo (datos de identificación + indicación), sin acceso al expediente.
  laboratorio: ['studies:process'],
  imagenologia: ['studies:process'],
};

export const can = (role, perm) => PERMS[role]?.includes(perm) ?? false;

// MIP/MPSS: borrador obligatorio hasta co-firma de Adscrito o Residente.
export const noteStatusFor = role => (can(role, 'notes:sign') ? 'firmada' : 'pendiente');
