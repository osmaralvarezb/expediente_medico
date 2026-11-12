import { sanitizeNoteHtml, isBlankNoteHtml } from './rich-text.js';

/**
 * Crea el HTML para un editor de notas clínicas.
 * @param {Object} options - Opciones del editor.
 * @param {string} [options.name='contenido'] - Nombre del campo oculto.
 * @param {string} [options.label='Nota clínica'] - Etiqueta del editor.
 * @param {string} [options.placeholder=''] - Texto de marcador de posición.
 * @returns {string} - HTML del editor.
 */
export function noteEditorHtml({ name = 'contenido', label = 'Nota clínica', placeholder = '' } = {}) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `
<div class="rte" data-rte="${name}">
  <span class="rte-label" id="rte-label-${name}">${esc(label)}</span>
  <div class="rte-toolbar" role="toolbar" aria-label="Formato del texto">
    <button type="button" class="rte-btn" data-cmd="bold" aria-label="Negritas (Ctrl+B)" title="Negritas (Ctrl+B)"><b>B</b></button>
    <button type="button" class="rte-btn" data-cmd="insertUnorderedList" aria-label="Viñetas" title="Viñetas">• Lista</button>
  </div>
  <div class="rte-area" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="rte-label-${name}" data-placeholder="${esc(placeholder)}"></div>
  <input type="hidden" name="${name}">
</div>
`;
}

/**
 * Vincula los eventos del editor de notas clínicas.
 * @param {HTMLFormElement} form - El formulario que contiene el editor.
 */
export function bindNoteEditor(form) {
  const editors = form.querySelectorAll('[data-rte]');
  editors.forEach(editor => {
    const area = editor.querySelector('.rte-area');
    const hiddenInput = editor.querySelector('input[type="hidden"]');
    const boldBtn = editor.querySelector('[data-cmd="bold"]');
    const listBtn = editor.querySelector('[data-cmd="insertUnorderedList"]');

    function sync() {
      const sanitized = sanitizeNoteHtml(area.innerHTML);
      hiddenInput.value = sanitized;
      area.classList.toggle('is-empty', isBlankNoteHtml(sanitized));
    }

    function updateToolbarState() {
      boldBtn.setAttribute('aria-pressed', document.queryCommandState('bold'));
      listBtn.setAttribute('aria-pressed', document.queryCommandState('insertUnorderedList'));
    }

    // Manejar clics en la barra de herramientas
    editor.querySelector('.rte-toolbar').addEventListener('click', e => {
      const cmd = e.target.closest('[data-cmd]');
      if (cmd) {
        e.preventDefault();
        area.focus();
        document.execCommand(cmd.dataset.cmd, false, null);
        sync();
        updateToolbarState();
      }
    });

    // Prevenir el comportamiento por defecto de los botones en la barra de herramientas
    editor.querySelector('.rte-toolbar').addEventListener('mousedown', e => {
      if (e.target.closest('[data-cmd]')) {
        e.preventDefault();
      }
    });

    // Manejar teclado dentro del área editable
    area.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold', false, null);
        sync();
        updateToolbarState();
      }
    });

    // Manejar pegado de texto plano
    area.addEventListener('paste', e => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    // Sincronizar en cada input y después de comandos
    area.addEventListener('input', sync);
    
    // Actualizar estado inicial del área
    sync();
    
    // Actualizar estado de la barra de herramientas
    area.addEventListener('keyup', updateToolbarState);
    area.addEventListener('mouseup', updateToolbarState);
  });
}

/**
 * Evita que se envíe el formulario al presionar Enter en campos no textarea ni contenteditable.
 * @param {HTMLFormElement} form - El formulario a modificar.
 */
export function preventEnterSubmit(form) {
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.target.matches('textarea, [contenteditable="true"]') && !e.target.matches('button')) {
      e.preventDefault();
    }
  });
}

/**
 * Lee el contenido del editor de notas clínicas.
 * @param {HTMLFormElement} form - El formulario que contiene el editor.
 * @param {string} name - Nombre del editor.
 * @returns {string} - HTML sanitizado del contenido del editor.
 */
export function readNoteEditor(form, name = 'contenido') {
  const area = form.querySelector(`[data-rte="${name}"] .rte-area`);
  return sanitizeNoteHtml(area.innerHTML);
}
