# IanaMed · MVP de expediente clínico electrónico

Aplicación web estática (HTML + CSS + JS, sin compilación) con datos mock en `localStorage`.

## Ejecutar

```bash
python -m http.server 5173
```

Abre http://localhost:5173. Todos los usuarios demo usan la contraseña `Iana2026!` (también hay botones de acceso rápido en el login).

| Usuario | Rol | Puede |
|---|---|---|
| `recepcion` | Recepción | Dar de alta pacientes, ver la ficha y exportar el PDF de identificación. Datos clínicos bloqueados. |
| `dra.mendoza` | Médico Adscrito | Todo lo clínico, co-firmar y rechazar notas de internos, exportar el expediente completo en PDF. |
| `dr.ruiz` | Médico Residente | Igual que el adscrito, salvo rechazar notas. |
| `mip.torres` | MIP / MPSS | Capturar notas sin diagnóstico ni plan; quedan **pendientes de validación**. |
| `admin` | Administrador TI | Solo bitácora y usuarios. Cero acceso a datos clínicos. |

**Flujo completo:** Alta de paciente → se abre el expediente → el médico registra antecedentes y la primera nota (firmada con SHA-256) → **Descargar expediente PDF**.

## Pruebas

```bash
node tests/rbac.test.mjs
```

## Estructura

- `js/rbac.js`: matriz de permisos por rol.
- `js/data.js`: datos mock y sello SHA-256 de las notas.
- `js/app.js`: router, vistas y bitácora.
- `js/pdf.js`: generación del PDF (jsPDF + autotable desde CDN).

> Es un MVP: el login, los permisos y los datos viven en el navegador. En producción se reemplazan por la API con RBAC del lado del servidor, Argon2id/JWT y cifrado AES-256-GCM, como dice la especificación.
