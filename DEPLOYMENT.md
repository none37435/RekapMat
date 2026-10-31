# Panduan Lengkap Deployment: Netlify, Vercel, dan Server Private

Aplikasi **Rekap Material Mesin & Jadwal Produksi** dirancang berbasis arsitektur SPA (Single Page Application) modern dengan Vite dan React. Aplikasi ini 100% siap di-deploy ke berbagai platform:
- **Netlify** (Cloud Hosting & CDN)
- **Vercel** (Cloud Hosting & Serverless)
- **Server Private / VPS / On-Premise** (Docker, Nginx, Node.js / PM2)

---

## 1. Deploy ke Netlify

File konfigurasi `netlify.toml` dan `public/_redirects` sudah disertakan di root repositori.

### Opsi A: Deploy via GitHub / GitLab / Bitbucket (Otomatis & Disarankan)
1. Push kode ke repository Git Anda (GitHub / GitLab).
2. Masuk ke dashboard [Netlify](https://app.netlify.com/) dan pilih **Add new site** > **Import an existing project**.
3. Hubungkan ke repositori Anda.
4. Pengaturan build akan terdeteksi otomatis dari `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Klik **Deploy site**.
6. Setiap push ke branch utama akan otomatis memicu build baru dan deploy ke seluruh edge CDN global Netlify.

### Opsi B: Deploy Cepat via Netlify CLI
1. Pasang Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Build aplikasi secara lokal:
   ```bash
   npm run build
   ```
3. Lakukan deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

---

## 2. Deploy ke Vercel

File konfigurasi `vercel.json` sudah disertakan di root repositori dengan konfigurasi routing SPA dan header caching aset.

### Opsi A: Deploy via Vercel Dashboard (Otomatis)
1. Buka dashboard [Vercel](https://vercel.com/) dan pilih **Add New...** > **Project**.
2. Impor repositori Git proyek ini.
3. Framework Preset akan otomatis terdeteksi sebagai **Vite**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Klik **Deploy**. Selesai!

### Opsi B: Deploy via Vercel CLI
1. Pasang Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Jalankan perintah deploy dari root folder:
   ```bash
   vercel --prod
   ```

---

## 3. Deploy ke Server Private (VPS / VM / Cloud On-Premise)

Untuk server private (Ubuntu, Debian, CentOS, Rocky Linux, AWS EC2, DigitalOcean Droplet, dsb.), tersedia 3 metode deployment:

---

### METODE 1: Docker & Docker Compose (Paling Praktis & Terisolasi)

File `Dockerfile`, `docker-compose.yml`, dan `nginx.conf` sudah siap pakai di root proyek.

1. **Pastikan Docker & Docker Compose sudah terpasang** di server Anda:
   ```bash
   docker --version
   docker compose version
   ```

2. **Clone repositori ke server**:
   ```bash
   git clone <URL_REPO_ANDA> /opt/rekap-material
   cd /opt/rekap-material
   ```

3. **Jalankan container menggunakan Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

4. **Cek status container**:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

Aplikasi langsung aktif di port `3000` (atau port yang Anda sesuaikan di `docker-compose.yml`):
`http://IP_SERVER_ANDA:3000`

Untuk menghentikan:
```bash
docker compose down
```

---

### METODE 2: Node.js & PM2 (Process Manager)

Jika Anda ingin menjalankan server Express (`server.js`) langsung pada sistem operasi server:

1. **Pasang Node.js (v18+) dan PM2**:
   ```bash
   # Di Ubuntu/Debian:
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Install dependency dan bangun file produksi**:
   ```bash
   npm install
   npm run build
   ```

3. **Jalankan server via PM2**:
   ```bash
   # Port default adalah 3000, atau sesuaikan via variabel PORT
   PORT=3000 pm2 start server.js --name "rekap-material"
   ```

4. **Atur agar otomatis berjalan saat server restart**:
   ```bash
   pm2 save
   pm2 startup
   ```

5. **Perintah manajemen PM2**:
   ```bash
   pm2 status
   pm2 logs rekap-material
   pm2 restart rekap-material
   ```

---

### METODE 3: Nginx Standalone Langsung di Server (High Performance)

Jika server Anda sudah memiliki Nginx terpasang:

1. **Build aplikasi**:
   ```bash
   npm install
   npm run build
   ```

2. **Salin hasil build ke direktori web Nginx**:
   ```bash
   sudo mkdir -p /var/www/rekap-material
   sudo cp -r dist/* /var/www/rekap-material/
   sudo chown -R www-data:www-data /var/www/rekap-material
   ```

3. **Buat file konfigurasi virtual host Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/rekap-material
   ```

   Isi dengan konfigurasi berikut:
   ```nginx
   server {
       listen 80;
       server_name domain-anda.com; # atau IP server

       root /var/www/rekap-material;
       index index.html;

       # Kompresi Gzip
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

       # Cache aset statis
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       # Fallback SPA (Sangat Penting agar tidak terjadi error 404 saat refresh)
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Aktifkan konfigurasi dan reload Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/rekap-material /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 4. Konfigurasi HTTPS / SSL Gratis (Let's Encrypt / Certbot)

Untuk mengamankan akses ke server private Anda dengan HTTPS (sangat disarankan untuk integrasi Google Sheets & keamanan):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com
```

Certbot akan otomatis memperbarui sertifikat SSL setiap 90 hari.

---

## Ringkasan Perintah Penting

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan local development server (port 3000) |
| `npm run build` | Melakukan kompilasi bundle produksi ke folder `dist` |
| `npm start` | Menjalankan production server Express (`server.js`) |
| `docker compose up -d --build` | Menjalankan container di server private |
