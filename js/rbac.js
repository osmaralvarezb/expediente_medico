// Matriz RBAC (ver especificación §2). Pura, sin dependencias del navegador, para poder probarla con Node.
export const ROLES = {
  adscrito: 'Médico Adscrito',
  residente: 'Médico Residente',
  mip: 'Interno / Pasante (MIP·MPSS)',
  recepcion: 'Recepción',
  admin: 'Administrador TI',
};

const PERMS = {
  adscrito: ['patients:read', 'patients:create', 'patients:update', 'clinical:read', 'clinical:write', 'history:write', 'diagnosis:write', 'notes:sign', 'notes:approve', 'notes:reject', 'pdf:clinical'],
  residente: ['patients:read', 'patients:create', 'patients:update', 'clinical:read', 'clinical:write', 'history:write', 'diagnosis:write', 'notes:sign', 'notes:approve', 'pdf:clinical'],
  mip: ['patients:read', 'clinical:read', 'clinical:write'],
  recepcion: ['patients:read', 'patients:create', 'patients:update', 'pdf:demographic'],
  admin: ['audit:read', 'users:read'],
};

export const can = (role, perm) => PERMS[role]?.includes(perm) ?? false;

// MIP/MPSS: borrador obligatorio hasta co-firma de Adscrito o Residente.
export const noteStatusFor = role => (can(role, 'notes:sign') ? 'firmada' : 'pendiente');
