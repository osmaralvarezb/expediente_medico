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
assert.equal(can('mip', 'diagnosis:write'), false, 'MIP no captura diagnóstico');
assert.equal(can('residente', 'notes:reject'), false, 'Residente no revoca notas');
assert.equal(can('adscrito', 'notes:reject'), true);
assert.equal(noteStatusFor('mip'), 'pendiente', 'Notas MIP quedan pendientes de validación');
assert.equal(noteStatusFor('residente'), 'firmada');
assert.equal(can('desconocido', 'patients:read'), false);
console.log('RBAC OK');
