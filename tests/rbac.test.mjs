import assert from 'node:assert/strict';
import { can, noteStatusFor } from '../js/rbac.js';

assert.equal(can('recepcion', 'clinical:read'), false, 'Recepción no ve datos clínicos');
assert.equal(can('recepcion', 'patients:create'), true, 'Recepción da de alta pacientes');
assert.equal(can('recepcion', 'patients:update'), true, 'Recepción actualiza datos demográficos');
assert.equal(can('mip', 'patients:update'), false, 'MIP no edita datos del paciente');
for (const r of ['adscrito', 'residente', 'mip']) assert.equal(can(r, 'clinical:read'), true, `${r} ve todos los expedientes`);
assert.equal(can('admin', 'clinical:read'), false, 'Admin TI: cero acceso clínico');
assert.equal(can('admin', 'patients:read'), false, 'Admin TI no ve pacientes');
assert.equal(can('admin', 'audit:read'), true);
assert.equal(can('admin', 'users:manage'), true, 'Admin TI da de alta y baja usuarios');
for (const r of ['adscrito', 'residente', 'mip', 'recepcion']) assert.equal(can(r, 'users:manage'), false, `${r} no gestiona usuarios`);
assert.equal(can('mip', 'diagnosis:write'), false, 'MIP no captura diagnóstico');
assert.equal(can('residente', 'notes:reject'), false, 'Residente no revoca notas');
assert.equal(can('adscrito', 'notes:reject'), true);
assert.equal(noteStatusFor('mip'), 'pendiente', 'Notas MIP quedan pendientes de validación');
assert.equal(noteStatusFor('residente'), 'firmada');
assert.equal(can('desconocido', 'patients:read'), false);
for (const r of ['laboratorio', 'imagenologia']) {
  assert.equal(can(r, 'studies:process'), true, `${r} procesa su lista de trabajo`);
  for (const p of ['patients:read', 'clinical:read', 'studies:request']) assert.equal(can(r, p), false, `${r} sin ${p} (mínimo privilegio)`);
}
for (const r of ['adscrito', 'residente']) assert.equal(can(r, 'studies:request'), true, `${r} solicita estudios`);
for (const r of ['mip', 'recepcion', 'admin']) assert.equal(can(r, 'studies:request'), false, `${r} no solicita estudios`);
assert.equal(can('recepcion', 'studies:deliver'), true, 'Recepción entrega resultados');
console.log('RBAC OK');
