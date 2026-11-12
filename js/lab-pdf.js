import { logo } from './pdf.js';
import { ANALYTES, FLAG_LABEL, FLAG_MARK, formatValue } from './labs.js';

const LAV = [161, 147, 201];
const BLUE = [63, 127, 196];
const INK = [31, 27, 46];
const SOFT = [246, 243, 252];
const LINE = [231, 227, 241];
const RED = [194, 69, 90];
const MUTED = [110, 104, 128];
const WHITE = [255, 255, 255];

/**
 * Convierte un string reemplazando caracteres no soportados por equivalentes válidos.
 * @param {string} s - Cadena de texto a procesar.
 * @returns {string} Cadena con caracteres especiales reemplazados.
 */
function pdfText(s) {
  return String(s ?? '').replace(/³/g, '3').replace(/⁶/g, '6').replace(/µ/g, 'u');
}

const fullNameOf = p => [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
const pad = n => String(n).padStart(2, '0');

/** Edad exacta en años (fecha local; resta 1 si aún no cumple años este año). */
function ageOf(fechaNacimiento, now = new Date()) {
  const d = new Date(fechaNacimiento + 'T00:00');
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}

/**
 * Exporta un informe de laboratorio como PDF.
 * @param {Object} patient - Información del paciente.
 * @param {Array} requests - Solicitudes de estudio.
 * @param {Object} user - Usuario que genera el PDF.
 */
export async function exportLabReport(patient, requests, user) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ compress: true, unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const img = await logo;
  const now = new Date();
  const fechaEmision = now.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  const age = ageOf(patient.fechaNacimiento, now);

  // Encabezado
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 30, 'F');
  doc.setFillColor(...LAV);
  doc.rect(0, 30, W, 2, 'F');

  if (img) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(12, 5, 20, 20, 3, 3, 'F');
    const { width, height } = doc.getImageProperties(img);
    const w = 17 * width / height;
    doc.addImage(img, 'PNG', 22 - w/2, 6.5, w, 17);
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text('IanaMed', 37, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Tu historial clínico, siempre disponible', 37, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  const title = requests.some(r => r.area === 'imagenologia') ? 'RESULTADOS DE ESTUDIOS' : 'RESULTADOS DE LABORATORIO';
  doc.text(title, W - 12, 14, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(patient.expediente, W - 12, 21, { align: 'right' });

  let y = 42;

  // Bloque del paciente
  const solicitud = new Date(requests[0].requestedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  doc.autoTable({
    body: [
      ['Paciente', fullNameOf(patient), 'Expediente', patient.expediente],
      ['Sexo', patient.sexo, 'Edad', `${age} años`],
      ['Médico solicitante', requests[0].requestedBy.name, 'Fecha de solicitud', solicitud],
      ['CURP', patient.curp, 'Fecha de emisión', fechaEmision],
    ],
    theme: 'grid',
    styles: { fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.2, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold', fillColor: SOFT }, 2: { cellWidth: 34, fontStyle: 'bold', fillColor: SOFT } },
    startY: y,
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Estudios completados
  const completedRequests = requests.filter(r => (r.status === 'listo' || r.status === 'entregado') && r.results);
  const sections = {};
  for (const req of completedRequests) {
    const section = ANALYTES[req.studyCode]?.section;
    if (!sections[section]) sections[section] = [];
    sections[section].push(req);
  }

  for (const [section, requestsInSection] of Object.entries(sections)) {
    // Verificar si se necesita nueva página
    if (y > H - 40) {
      doc.addPage();
      y = 20;
    }

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    const sectionTitle = pdfText(section).toUpperCase();
    doc.text(sectionTitle, W / 2, y, { align: 'center' });
    y += 6;

    for (const req of requestsInSection) {
      // Verificar si se necesita nueva página
      if (y > H - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLUE);
      const studyLine = `${pdfText(req.studyName)} · Muestra ${req.sampleCode}`;
      doc.text(studyLine, 14, y);
      y += 6;

      const tableData = req.results.map(r => {
        const value = formatValue(req.studyCode, r);
        const unit = pdfText(r.unit);
        const ref = r.ref;
        const flag = r.flag;
        let mark = '';
        if (flag) {
          mark = `${FLAG_MARK[flag]} ${FLAG_LABEL[flag]}`;
        }
        return [r.name, value, unit, mark, ref];
      });

      doc.autoTable({
        head: [['EXÁMENES', 'RESULTADOS', 'UNIDADES', '', 'VALORES DE REFERENCIA']],
        body: tableData,
        theme: 'plain',
        styles: { fontSize: 9, textColor: INK },
        headStyles: {
          fontStyle: 'bold',
          textColor: INK,
          lineWidth: { bottom: 0.3 },
          lineColor: INK
        },
        columnStyles: {
          0: { cellWidth: 64 },
          1: { cellWidth: 26, halign: 'right' },
          2: { cellWidth: 20 },
          3: { cellWidth: 26 },
          4: { cellWidth: 'auto' }
        },
        startY: y,
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          // Valor fuera de rango: fila en negritas y resultado + marca en rojo (como el formato de referencia).
          if (data.section === 'body' && data.row.raw[3]) {
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 1 || data.column.index === 3) data.cell.styles.textColor = RED;
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.setDrawColor(...LINE);
            doc.setLineWidth(0.1);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      y = doc.lastAutoTable.finalY + 6;

      // Validado por
      if (req.completedBy) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`Validado por: ${req.completedBy.name}`, 14, y);
        y += 5;
      }

      // Observaciones
      if (req.resultado) {
        const obsText = `Observaciones: ${req.resultado}`;
        const wrapped = doc.splitTextToSize(obsText, W - 28);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5;
      }
    }
  }

  // Estudios de imagenología completados
  const imagingRequests = requests.filter(r => r.area === 'imagenologia' && (r.status === 'listo' || r.status === 'entregado') && r.resultado);
  if (imagingRequests.length > 0) {
    if (y > H - 40) {
      doc.addPage();
      y = 20;
    }

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text('IMAGENOLOGÍA', W / 2, y, { align: 'center' });
    y += 6;

    for (const req of imagingRequests) {
      if (y > H - 40) {
        doc.addPage();
        y = 20;
      }

      const tableData = [
        [`${pdfText(req.studyName)}\nMuestra ${req.sampleCode}`, `Interpretación: ${req.resultado}\nValidó: ${req.completedBy?.name || 'N/A'}`]
      ];

      doc.autoTable({
        head: [['', '']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, textColor: INK },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 60 } },
        startY: y,
        margin: { left: 14, right: 14 }
      });

      y = doc.lastAutoTable.finalY + 6;
    }
  }

  // Estudios pendientes
  const pendingRequests = requests.filter(r => r.status !== 'listo' && r.status !== 'entregado');
  if (pendingRequests.length > 0) {
    if (y > H - 40) {
      doc.addPage();
      y = 20;
    }

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text('Estudios pendientes', W / 2, y, { align: 'center' });
    y += 6;

    for (const req of pendingRequests) {
      if (y > H - 40) {
        doc.addPage();
        y = 20;
      }

      const statusLabels = {
        solicitado: 'Solicitado',
        en_proceso: 'En proceso',
        cancelado: 'Cancelado'
      };

      const statusLabel = statusLabels[req.status] || req.status;
      const line = `• ${pdfText(req.studyName)} (${req.sampleCode}) — ${statusLabel}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(line, 14, y);
      y += 5;
    }
  }

  // Leyenda
  if (y > H - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const legend = '*A = valor por arriba del rango de referencia · *B = valor por debajo del rango de referencia · * = resultado distinto al esperado';
  const wrappedLegend = doc.splitTextToSize(legend, W - 28);
  doc.text(wrappedLegend, 14, y);
  y += wrappedLegend.length * 5;

  // Pie de página
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setLineWidth(0.2);
    doc.setDrawColor(...LAV);
    doc.line(14, H - 14, W - 14, H - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const date = now.toLocaleString('es-MX', { dateStyle: 'medium' });
    doc.text(`Documento confidencial. Generado por ${user.name} el ${date}`, 14, H - 9);
    doc.text(`Página ${i} de ${doc.getNumberOfPages()}`, W - 12, H - 9, { align: 'right' });
  }

  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Resultados_${patient.expediente}_${yyyymmdd}.pdf`;
  doc.save(filename);
}

/**
 * Exporta etiquetas de tubos como PDF.
 * @param {Object} patient - Información del paciente.
 * @param {Array} requests - Solicitudes de estudio.
 */
export async function exportLabels(patient, requests) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ compress: true, unit: 'mm', format: 'letter' });

  // Formato Avery 5160: 3 × 10 etiquetas de 66.7 × 25.4 mm por hoja carta.
  const labelWidth = 66.7;
  const labelHeight = 25.4;
  const leftMargin = 4.8;
  const topMargin = 12.7;
  const hGap = 3.2;

  let labelCount = 0;
  const age = ageOf(patient.fechaNacimiento);
  const fullName = fullNameOf(patient);

  for (const req of requests) {
    if (labelCount >= 30) {
      doc.addPage();
      labelCount = 0;
    }

    const x = leftMargin + (labelCount % 3) * (labelWidth + hGap);
    const y = topMargin + Math.floor(labelCount / 3) * (labelHeight);

    // Dibujar borde redondeado
    doc.setLineWidth(0.2);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, labelWidth, labelHeight, 1, 1, 'S');

    // Línea 1: sampleCode
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(req.sampleCode, x + 3, y + 5);

    // Línea 2: nombre del paciente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const truncatedName = doc.splitTextToSize(fullName, labelWidth - 6)[0];
    doc.text(truncatedName, x + 3, y + 10);

    // Línea 3: expediente, sexo, edad
    const sexoAbbr = patient.sexo === 'Femenino' ? 'F' : patient.sexo === 'Masculino' ? 'M' : 'O';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${patient.expediente} · ${sexoAbbr} · ${age} a`, x + 3, y + 14);

    // Línea 4: estudio y fecha
    const studyWidth = labelWidth - 6 - 14;
    const truncatedStudy = doc.splitTextToSize(pdfText(req.studyName), studyWidth)[0];
    const d = new Date(req.requestedAt);
    const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text(truncatedStudy, x + 3, y + 19);
    doc.setTextColor(...MUTED);
    doc.text(dateStr, x + labelWidth - 3, y + 19, { align: 'right' });

    labelCount++;
  }

  const filename = `Etiquetas_${patient.expediente}.pdf`;
  doc.save(filename);
}
