# IanaMed · Expediente clínico electrónico (Incremento 1, v0.1.0)

Primer incremento funcional de IanaMed: consulta ágil del expediente clínico por CURP, notas clínicas selladas y bitácora de auditoría. Es una aplicación web estática (HTML + CSS + JavaScript con módulos ES, sin compilación) que guarda sus datos de prueba en el `localStorage` del navegador.

- **Aplicación en línea:** https://osmaralvarezb.github.io/expediente_medico/
- **Casos de uso incluidos:** CU-01 Autenticación, CU-02 Consulta por CURP, CU-03 Registro de nota clínica y CU-05 Bitácora de auditoría (parcial). Ver [RELEASE_NOTES.md](RELEASE_NOTES.md).

## Usuarios de prueba

Contraseña de todos: `Iana2026!`. En la pantalla de acceso también hay botones de acceso rápido.

| Acceso (cédula o usuario) | Nombre | Rol | Puede |
|---|---|---|---|
| `10234567` | Dra. Laura Mendoza | Médico Adscrito | Todo lo clínico; firma, co-firma y rechaza notas de internos; exporta el expediente en PDF. |
| `11345678` | Dr. Andrés Ruiz | Médico Residente | Igual que el adscrito, salvo rechazar notas. |
| `mip.torres` | Sofía Torres | MIP / MPSS | Captura notas sin diagnóstico ni plan; quedan pendientes de co-firma. |
| `recepcion` | Carmen López | Recepción | Alta y edición de datos demográficos; ficha PDF. Sin acceso clínico. |
| `admin` | Jorge Salas | Administrador TI | Solo bitácora y usuarios. Sin acceso a pacientes. |
| `12456789` | QFB Mariana Pérez | Laboratorio clínico (QFB) | Lista de trabajo de laboratorio: inicia estudios, captura el resultado y los marca listos para recoger. Sin acceso al expediente. |
| `13567890` | Dr. Hugo Lara | Imagenología (Radiología) | Igual que laboratorio, para estudios de gabinete (Rx, USG, TAC, RM, mastografía, densitometría). |

**Estudios:**
1. El médico (adscrito o residente) marca uno o varios estudios en una sola solicitud. Cada estudio recibe su código de muestra (`LAB-AAMMDD-0001`, `GAB-…`) y el botón **Etiquetas PDF** imprime una etiqueta por tubo (formato Avery 5160).
2. Laboratorio escribe o escanea el código: la muestra queda recibida y se abre el formulario con los analitos, sus unidades y su rango de referencia (por sexo cuando aplica). Cada valor se marca en vivo como ↑ Alto o ↓ Bajo.
3. Al guardar, el estudio queda como **"Resultados disponibles"**: no se recoge nada en laboratorio; el médico ve la tabla de resultados y descarga el **PDF de resultados** (*A / *B fuera de rango), igual que laboratorio.
4. Imagenología sí conserva el flujo físico: al terminar, el expediente y la lista de pacientes muestran el aviso "listo para recoger" con el lugar de entrega, y Recepción o el médico lo marcan como entregado.

Para probar la captura: entra como `12456789` y usa el código `LAB-261103-0002` (perfil de lípidos de María).

## Ejecutar en local

Requisitos: un navegador moderno y Python 3 (o cualquier servidor de archivos estáticos). Los módulos ES no funcionan abriendo `index.html` con doble clic: se necesita servirlos por HTTP.

```bash
git clone https://github.com/osmaralvarezb/expediente_medico.git
cd expediente_medico
python -m http.server 5173
```

Abrir http://localhost:5173. Se requiere internet para cargar jsPDF (CDN) y las fuentes; sin internet la app funciona, pero no genera PDF.

## Pruebas

```bash
npm test                 # 15 aserciones RBAC + 23 pruebas de dominio (Node 18+)
npm i -D playwright && npx playwright install chromium
python -m http.server 5173 &   # en otra terminal
npm run test:e2e         # 21 casos de prueba de sistema (CP-01 a CP-21)
```

GitHub Actions (`.github/workflows/ci.yml`) ejecuta `npm test` en cada push a `main`/`develop` y en cada Pull Request.

## Arquitectura

```
index.html            Punto de entrada; carga jsPDF desde CDN y js/app.js como módulo
css/styles.css        Estilos (paleta IanaMed, diseño adaptable a móvil)
js/app.js             Router por hash, vistas (login, pacientes, expediente, bitácora, usuarios) y bitácora
js/rbac.js            Matriz de permisos por rol (pura, probada con Node)
js/validators.js      Validación de CURP y de campos obligatorios NOM-004 (pura, probada con Node)
js/data.js            Datos semilla, autenticación por cédula y sello SHA-256 de notas
js/pdf.js             Exportación del expediente o de la ficha a PDF (jsPDF + autotable)
tests/                rbac.test.mjs, domain.test.mjs (unitarias) y e2e.test.mjs (sistema, Playwright)
```

En este incremento las capas del patrón Controller-Service-Repository del plan se aproximan en el cliente: `app.js` hace de controlador y vista, `rbac.js`/`validators.js` contienen las reglas de negocio y `data.js` hace de repositorio sobre `localStorage`. La separación en API + PostgreSQL queda en el Product Backlog.

### Reglas clave

- **Autenticación (CU-01):** `findUser()` acepta cédula profesional o nombre de usuario. La sesión vive en `sessionStorage` (se cierra al cerrar la pestaña).
- **Permisos (RF-03):** cada ruta declara un permiso; `can(rol, permiso)` lo valida antes de dibujar la vista. Un acceso denegado se registra en la bitácora.
- **CURP (CU-02):** `validateCurp()` revisa estructura, fecha real, sexo y clave de entidad; la fecha de nacimiento capturada debe coincidir con la de la CURP y no se permiten CURP duplicadas.
- **Notas (CU-03):** `missingNoteFields()` exige signos vitales, padecimiento y exploración; quien firma además debe capturar diagnóstico CIE-10 y plan. Antes de firmar se advierte que la nota no podrá modificarse. La nota firmada se sella con SHA-256 (`noteHash`) y en cada consulta se verifica el sello (`verifyNote`); si no coincide se muestra "Integridad comprometida" y se registra en la bitácora.
- **Bitácora (CU-05):** cada evento guarda fecha y hora, usuario, cédula, rol, IP pública y acción. Solo se insertan eventos; restablecer los datos de prueba conserva la bitácora.

### Limitaciones conocidas de este incremento

Al no existir servidor, la autenticación, los permisos y la bitácora se aplican en el navegador y pueden alterarse con las herramientas de desarrollador (el sello SHA-256 lo detecta en las notas). La IP se obtiene de `api.ipify.org` y muestra `N/D` si no hay red. No hay cifrado AES-256 en reposo; GitHub Pages sirve la app por HTTPS (TLS 1.2/1.3). Todo esto se atiende con el backend planeado (API + PostgreSQL + Argon2id/JWT + AES-256).

## Despliegue

Ver [DEPLOY.md](DEPLOY.md).
