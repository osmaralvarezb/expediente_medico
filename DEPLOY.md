# Procedimiento de despliegue · IanaMed v0.1.0

IanaMed v0.1.0 es un sitio estático: desplegar significa publicar los archivos del repositorio en un servidor web con HTTPS. El despliegue oficial del incremento es **GitHub Pages**.

## A. GitHub Pages (despliegue oficial)

Requisitos: permisos de administrador del repositorio `osmaralvarezb/expediente_medico`. Si el repositorio es privado, GitHub Pages requiere un plan de pago; con una cuenta gratuita el repositorio debe ser público.

1. Subir la versión a `main`:
   ```bash
   git checkout main
   git pull
   npm test                 # deben pasar todas las pruebas
   git tag -a v0.1.0 -m "IanaMed incremento 1"
   git push origin main --tags
   ```
2. En GitHub: **Settings → Pages → Build and deployment**.
   - *Source:* `Deploy from a branch`
   - *Branch:* `main` · carpeta `/ (root)` → **Save**.
3. Esperar 1 a 2 minutos. En **Actions** aparece el flujo `pages build and deployment`; al terminar en verde, la app queda en:
   **https://osmaralvarezb.github.io/expediente_medico/**
4. Verificar el despliegue (prueba de humo):
   - Abrir la URL en una ventana de incógnito: debe aparecer la pantalla de acceso con el logotipo.
   - Entrar con la cédula `10234567` / `Iana2026!` y abrir el expediente de María Guadalupe Hernández Soto.
   - Descargar el expediente en PDF.
   - Cerrar sesión, entrar como `admin` y comprobar que la bitácora muestra cédula e IP.
5. (Opcional) Crear el *release*: **Releases → Draft a new release → tag v0.1.0** y pegar el contenido de `RELEASE_NOTES.md`.

Cada push posterior a `main` vuelve a publicar el sitio automáticamente.

### Reversión

Si una versión publicada falla, revertir el commit y volver a subir:

```bash
git revert <commit>
git push origin main
```

GitHub Pages publica de nuevo la versión anterior en 1 a 2 minutos.

## B. Servidor propio (alternativa: Linux con Nginx)

```bash
sudo apt install nginx
sudo git clone https://github.com/osmaralvarezb/expediente_medico.git /var/www/ianamed
```

`/etc/nginx/sites-available/ianamed`:

```nginx
server {
    listen 80;
    server_name ianamed.ejemplo.mx;
    root /var/www/ianamed;
    index index.html;
    location ~ /\.(git|github) { deny all; }
    location / { try_files $uri $uri/ /index.html; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ianamed /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ianamed.ejemplo.mx   # HTTPS con Let's Encrypt
```

Para actualizar: `cd /var/www/ianamed && sudo git pull`.

## C. Equipo local (revisión sin internet)

```bash
python -m http.server 5173
```

Abrir http://localhost:5173. Sin internet la app funciona, pero no genera PDF (jsPDF se carga desde CDN) y la bitácora registra la IP como `N/D`.
