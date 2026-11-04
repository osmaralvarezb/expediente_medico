// Datos mock. shortcut: todo vive en localStorage del navegador; reemplazar por API + BD cifrada (AES-256-GCM) al pasar del MVP.

export const CIE10 = [
  ['E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'],
  ['I10', 'Hipertensión esencial (primaria)'],
  ['J45.9', 'Asma, no especificada'],
  ['J06.9', 'Infección aguda de vías respiratorias superiores'],
  ['K29.7', 'Gastritis, no especificada'],
  ['N39.0', 'Infección de vías urinarias, sitio no especificado'],
  ['R50.9', 'Fiebre, no especificada'],
  ['M54.5', 'Lumbago no especificado'],
  ['E78.5', 'Hiperlipidemia, no especificada'],
  ['F41.1', 'Trastorno de ansiedad generalizada'],
];

export async function noteHash(patientId, n) {
  const payload = JSON.stringify([patientId, n.tipo, n.fecha, n.autorId, n.vitals, n.subjetivo, n.exploracion, n.dx, n.plan]);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// shortcut: contraseñas en claro y login en el cliente solo para la demo; en producción Argon2id + JWT HttpOnly en el servidor.
const users = [
  { id: 'u1', username: 'dra.mendoza', password: 'Iana2026!', name: 'Dra. Laura Mendoza', role: 'adscrito', area: 'Medicina Interna' },
  { id: 'u2', username: 'dr.ruiz', password: 'Iana2026!', name: 'Dr. Andrés Ruiz', role: 'residente', area: 'R2 Medicina Interna' },
  { id: 'u3', username: 'mip.torres', password: 'Iana2026!', name: 'Sofía Torres', role: 'mip', area: 'Internado de pregrado' },
  { id: 'u4', username: 'recepcion', password: 'Iana2026!', name: 'Carmen López', role: 'recepcion', area: 'Admisión' },
  { id: 'u5', username: 'admin', password: 'Iana2026!', name: 'Jorge Salas', role: 'admin', area: 'Tecnologías de la Información' },
];

const vit = (ta, fc, fr, temp, sat, peso, talla) => ({ ta, fc, fr, temp, sat, peso, talla });

export async function seedDb() {
  const patients = [
    {
      id: 'p1', expediente: 'EXP-2026-0001', nombre: 'María Guadalupe', apellidoPaterno: 'Hernández', apellidoMaterno: 'Soto',
      fechaNacimiento: '1968-03-14', sexo: 'Femenino', curp: 'HESM680314MDFRTR09', telefono: '5512345678', email: 'mg.hernandez@correo.mx',
      domicilio: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX', aseguradora: 'IMSS', contactoNombre: 'Ricardo Hernández (hijo)', contactoTelefono: '5598765432',
      createdAt: '2026-09-02T09:15:00', createdBy: 'Carmen López',
      antecedentes: { tipoSangre: 'O+', alergias: 'Penicilina (urticaria)', cronicos: 'Diabetes mellitus tipo 2 (2015), Hipertensión arterial (2018)', quirurgicos: 'Colecistectomía laparoscópica (2010)', heredofamiliares: 'Madre con DM2, padre con cardiopatía isquémica', medicamentos: 'Metformina 850 mg c/12 h, Losartán 50 mg c/24 h' },
      notes: [
        { id: 'n1', tipo: 'Historia clínica', fecha: '2026-09-02T10:40:00', autorId: 'u1', autor: 'Dra. Laura Mendoza', autorRol: 'adscrito', vitals: vit('138/86', 78, 16, 36.6, 97, 74, 158), subjetivo: 'Acude a control de DM2 e HAS. Refiere poliuria leve y cefalea ocasional vespertina.', exploracion: 'Consciente, orientada, hidratada. Campos pulmonares limpios, ruidos cardiacos rítmicos. Pulsos periféricos presentes.', dx: 'E11.9 Diabetes mellitus tipo 2 sin complicaciones', plan: 'Continuar metformina. Solicitar HbA1c, perfil lipídico y EGO. Dieta 1600 kcal. Cita en 4 semanas.', status: 'firmada' },
        { id: 'n2', tipo: 'Nota de evolución', fecha: '2026-11-03T08:20:00', autorId: 'u3', autor: 'Sofía Torres', autorRol: 'mip', vitals: vit('132/84', 74, 16, 36.5, 98, 73, 158), subjetivo: 'Paciente refiere mejoría de la cefalea, apego parcial a dieta.', exploracion: 'Sin cambios relevantes respecto a la exploración previa.', dx: '', plan: '', status: 'pendiente' },
      ],
    },
    {
      id: 'p2', expediente: 'EXP-2026-0002', nombre: 'José Luis', apellidoPaterno: 'Ramírez', apellidoMaterno: 'Ortega',
      fechaNacimiento: '1985-11-02', sexo: 'Masculino', curp: 'RAOJ851102HDFMRS04', telefono: '5587654321', email: 'jl.ramirez@correo.mx',
      domicilio: 'Calle Morelos 45, Centro, Toluca, Edo. Méx.', aseguradora: 'Particular', contactoNombre: 'Patricia Ortega (esposa)', contactoTelefono: '7221122334',
      createdAt: '2026-10-11T12:05:00', createdBy: 'Carmen López',
      antecedentes: { tipoSangre: 'A+', alergias: 'Negadas', cronicos: 'Asma intermitente desde la infancia', quirurgicos: 'Negados', heredofamiliares: 'Padre con asma', medicamentos: 'Salbutamol inhalado PRN' },
      notes: [
        { id: 'n3', tipo: 'Nota de urgencias', fecha: '2026-10-11T13:30:00', autorId: 'u2', autor: 'Dr. Andrés Ruiz', autorRol: 'residente', vitals: vit('124/78', 102, 24, 37.1, 92, 82, 175), subjetivo: 'Disnea de 6 horas de evolución tras exposición a polvo. Tos seca.', exploracion: 'Sibilancias espiratorias bilaterales, uso leve de músculos accesorios.', dx: 'J45.9 Asma, no especificada', plan: 'Nebulización con salbutamol + bromuro de ipratropio x3. Prednisona 40 mg VO x5 días. Revaloración en 1 h.', status: 'firmada' },
      ],
    },
    {
      id: 'p3', expediente: 'EXP-2026-0003', nombre: 'Ana Sofía', apellidoPaterno: 'Castillo', apellidoMaterno: 'Vega',
      fechaNacimiento: '1999-07-21', sexo: 'Femenino', curp: 'CAVA990721MJCSGN02', telefono: '3311223344', email: 'ana.castillo@correo.mx',
      domicilio: 'Av. Vallarta 890, Guadalajara, Jal.', aseguradora: 'ISSSTE', contactoNombre: 'Elena Vega (madre)', contactoTelefono: '3355667788',
      createdAt: '2026-11-03T16:45:00', createdBy: 'Carmen López', antecedentes: {}, notes: [],
    },
  ];
  for (const p of patients) for (const n of p.notes) if (n.status === 'firmada') n.hash = await noteHash(p.id, n);
  return {
    seq: 3,
    users,
    patients,
    audit: [{ ts: '2026-11-03T16:45:00', user: 'recepcion', role: 'recepcion', action: 'Alta de paciente', detail: 'EXP-2026-0003' }],
  };
}
