// Usuarios de prueba que crea npm run db:seed (sin contraseñas: se hashean con Argon2id al sembrar).
// Sprint 2 · fase roja: falta la cuenta de revisión de Enfermería (HU-05 · SCRUM-10).
export const USUARIOS_SEMILLA = [
  ['dra.mendoza', '10234567', 'Dra. Laura Mendoza', 'adscrito'],
  ['dr.ruiz', '11345678', 'Dr. Andrés Ruiz', 'residente'],
  ['mip.torres', null, 'Sofía Torres', 'mip'],
  ['recepcion', null, 'Carmen López', 'recepcion'],
  ['admin', null, 'Jorge Salas', 'admin'],
  // Cuentas exclusivas para la revisión docente (no son cuentas personales de integrantes).
  ['revision.medico', null, 'Revisión docente (médico)', 'adscrito'],
  ['revision.admin', null, 'Revisión docente (auditoría)', 'admin'],
];
