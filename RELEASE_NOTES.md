# Notas de versión · IanaMed v0.1.0 (Incremento 1)

**Fecha:** 6 de noviembre de 2026 · **Fase:** Transición (OpenUP) · **URL:** https://osmaralvarezb.github.io/expediente_medico/

## Qué incluye

**CU-01 Autenticación del personal**
- Acceso con cédula profesional o con usuario (personal sin cédula) y contraseña.
- Cinco roles con mínimo privilegio: Médico Adscrito, Médico Residente, MIP/MPSS, Recepción y Administrador TI.
- Rutas protegidas por permiso; los accesos denegados se registran.

**CU-02 Consulta del expediente por CURP**
- Búsqueda inmediata por CURP (también por nombre o número de expediente).
- Ficha de identificación, antecedentes y notas en una sola pantalla; se abre en un clic desde la lista.
- Alta de pacientes con validación completa de la CURP (estructura, fecha real, sexo, entidad), coincidencia con la fecha de nacimiento y bloqueo de duplicados.

**CU-03 Registro de nota clínica**
- Historia clínica, nota de evolución, de ingreso y de urgencias con signos vitales, padecimiento, exploración, diagnóstico CIE-10 y plan.
- Campos obligatorios según NOM-004; quien firma debe capturar diagnóstico y plan.
- Advertencia de inmutabilidad antes de firmar; la nota firmada se sella con SHA-256 y no se puede editar ni eliminar.
- Notas de MIP/MPSS como borrador hasta la co-firma de un adscrito o residente; el adscrito puede rechazarlas con motivo.
- Verificación del sello en cada consulta: una nota alterada fuera del sistema muestra "Integridad comprometida".

**CU-05 Bitácora de auditoría (parcial)**
- Registra inicios de sesión (exitosos y fallidos), consultas, altas, notas, co-firmas, rechazos, exportaciones, accesos denegados y alertas de integridad.
- Cada evento guarda fecha y hora, usuario, cédula, rol e IP pública. Restablecer los datos de prueba conserva la bitácora.

**Adicional**
- Exportación del expediente completo (médicos) o de la ficha de identificación (Recepción) a PDF.
- Diseño adaptable a celular.
- 59 pruebas automatizadas (38 unitarias + 21 de sistema) e integración continua con GitHub Actions.

## Qué queda pendiente (Product Backlog, Parte II)

| Pendiente | Requerimiento | Motivo |
|---|---|---|
| API con PostgreSQL y capas Controller-Service-Repository | RNF-06, ORM-03 | El incremento se construyó en el cliente para entregar los casos de uso a tiempo. |
| Autenticación en servidor (Argon2id + JWT) y RBAC en servidor | RF-01, RF-03 | Depende de la API. |
| Bitácora inmutable en BD (solo inserción) con IP tomada por el servidor | RF-04, RNF-04 | Hoy vive en el navegador y la IP la consulta un servicio externo. |
| Cifrado AES-256 en reposo | RNF-03 | Depende de la BD. HTTPS ya lo aporta GitHub Pages. |
| CU-04 Visor de reportes y diagnósticos previos en PDF | RF-06 | Requiere almacenamiento de archivos en servidor. |
| Pruebas de carga y estrés | RNF-01 | Requieren el backend desplegado. |
| Rol de Enfermería | CU-01 | Pendiente de definir permisos con el cliente. |
| Historial de versiones de antecedentes | NOM-004 | Hoy se sobrescriben; la bitácora sí registra cada cambio. |

## Problemas conocidos

- Los datos viven en el navegador de cada usuario: otro equipo o navegador no ve los mismos pacientes.
- Sin internet no se genera el PDF y la IP queda como `N/D`.
- Los permisos y la bitácora pueden alterarse con las herramientas de desarrollador del navegador; el sello SHA-256 detecta los cambios en notas firmadas.

## Usuarios de prueba

Contraseña `Iana2026!`: `10234567` (adscrita), `11345678` (residente), `mip.torres`, `recepcion`, `admin`.
