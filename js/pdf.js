const LAV = [161, 147, 201], BLUE = [63, 127, 196], INK = [31, 27, 46], SOFT = [246, 243, 252], LINE = [231, 227, 241];

// Reescala el logo a 240 px para que el PDF no pese ~500 KB.
const logo = new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const c = Object.assign(document.createElement('canvas'), { width: 240, height: Math.round(240 * img.height / img.width) });
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    res(c.toDataURL('image/png'));
  };
  img.onerror = () => res(null);
  img.src = 'assets/logo.png';
});

const dt = iso => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const STATUS = { firmada: 'Firmada', pendiente: 'PENDIENTE DE VALIDACIÓN - sin validez legal', rechazada: 'Rechazada' };

// clinical=false -> solo ficha de identificación (rol Recepción).
export async function exportPdf(p, user, { clinical }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BLUE); doc.rect(0, 0, W, 30, 'F');
  doc.setFillColor(...LAV); doc.rect(0, 30, W, 2, 'F');
  const img = await logo;
  if (img) { doc.setFillColor(255, 255, 255); doc.roundedRect(12, 5, 20, 20, 3, 3, 'F'); const { width, height } = doc.getImageProperties(img), w = 17 * width / height; doc.addImage(img, 'PNG', 22 - w / 2, 6.5, w, 17); }
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold'); doc.setFontSize(20); doc.text('IanaMed', 37, 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Tu historial clínico, siempre disponible', 37, 21);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(clinical ? 'EXPEDIENTE CLÍNICO' : 'FICHA DE IDENTIFICACIÓN', W - 12, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(p.expediente, W - 12, 21, { align: 'right' });

  let y = 42;
  const title = text => {
    if (y > H - 40) { doc.addPage(); y = 20; }
    doc.setTextColor(...BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(text, 14, y); y += 3;
  };
  const kv = rows => {
    doc.autoTable({
      startY: y, body: rows.map(([k, v]) => [k, v || '-']), theme: 'grid', margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2.2, textColor: INK, lineColor: LINE, lineWidth: .2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: SOFT } },
    });
    y = doc.lastAutoTable.finalY + 9;
  };

  title('Ficha de identificación');
  kv([
    ['Nombre', `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno ?? ''}`],
    ['Fecha de nacimiento', new Date(p.fechaNacimiento + 'T00:00').toLocaleDateString('es-MX', { dateStyle: 'long' })],
    ['Sexo', p.sexo], ['CURP', p.curp], ['Teléfono', p.telefono], ['Correo', p.email], ['Domicilio', p.domicilio],
    ['Derechohabiencia', p.aseguradora], ['Contacto de emergencia', `${p.contactoNombre} - ${p.contactoTelefono}`],
    ['Alta administrativa', `${dt(p.createdAt)} por ${p.createdBy}`],
    ...(p.updatedAt ? [['Última actualización', `${dt(p.updatedAt)} por ${p.updatedBy}`]] : []),
  ]);

  if (clinical) {
    const a = p.antecedentes ?? {};
    title('Antecedentes');
    kv([['Tipo de sangre', a.tipoSangre], ['Alergias', a.alergias], ['Enfermedades crónicas', a.cronicos], ['Quirúrgicos', a.quirurgicos], ['Heredofamiliares', a.heredofamiliares], ['Medicamentos actuales', a.medicamentos]]);

    const notes = [...p.notes].sort((x, z) => x.fecha.localeCompare(z.fecha));
    if (!notes.length) { title('Notas clínicas'); kv([['Notas', 'Sin notas registradas']]); }
    for (const n of notes) {
      const v = n.vitals ?? {};
      title(`${n.tipo} - ${dt(n.fecha)}`);
      kv([
        ['Autor', n.autor], ['Estado', STATUS[n.status]],
        ['Signos vitales', `TA ${v.ta || '-'} mmHg | FC ${v.fc || '-'} lpm | FR ${v.fr || '-'} rpm | Temp ${v.temp || '-'} °C | SpO2 ${v.sat || '-'} % | Peso ${v.peso || '-'} kg | Talla ${v.talla || '-'} cm`],
        ['Padecimiento / subjetivo', n.subjetivo], ['Exploración física', n.exploracion],
        ['Diagnóstico (CIE-10)', n.dx], ['Plan terapéutico', n.plan],
        ...(n.cofirma ? [['Co-firma', `${n.cofirma.by} - ${dt(n.cofirma.at)}`]] : []),
        ...(n.rechazo ? [['Motivo de rechazo', `${n.rechazo.motivo} (${n.rechazo.by})`]] : []),
        ...(n.hash ? [['Sello SHA-256', n.hash]] : []),
      ]);
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LAV); doc.line(14, H - 14, W - 14, H - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 104, 128);
    doc.text(`Documento confidencial. Generado por ${user.name} el ${dt(new Date().toISOString())}`, 14, H - 9);
    doc.text(`Página ${i} de ${pages}`, W - 14, H - 9, { align: 'right' });
  }
  doc.save(`${p.expediente}_${p.apellidoPaterno}.pdf`);
}
