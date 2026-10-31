import React, { useState } from 'react';
import {
  X,
  Server,
  Cloud,
  Check,
  Copy,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Layers,
  FileCode,
  Box,
  Cpu,
} from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'netlify' | 'vercel' | 'docker' | 'pm2' | 'nginx'>('netlify');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const netlifyConfig = `# netlify.toml (Telah tersedia di root proyek)
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;

  const vercelConfig = `// vercel.json (Telah tersedia di root proyek)
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`;

  const dockerComposeCmd = `# 1. Clone repositori ke server private Anda
git clone <URL_REPO_ANDA> /opt/rekap-material
cd /opt/rekap-material

# 2. Jalankan container produksi via Docker Compose
docker compose up -d --build

# 3. Periksa status aplikasi
docker compose ps`;

  const pm2Cmd = `# 1. Install dependensi dan bangun bundle
npm install
npm run build

# 2. Jalankan via PM2 Process Manager (Port default 3000)
PORT=3000 pm2 start server.js --name "rekap-material"

# 3. Simpan konfigurasi agar otomatis nyala saat server reboot
pm2 save
pm2 startup`;

  const nginxConfig = `server {
    listen 80;
    server_name rekap.perusahaan.com;

    root /var/www/rekap-material;
    index index.html;

    # Fallback SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache asset statis
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Panduan Deployment Aplikasi
              </h2>
              <p className="text-xs text-slate-300">
                Aplikasi siap di-deploy ke Netlify, Vercel, maupun Server Private (On-Premise / VPS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('netlify')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'netlify'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>Netlify</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-mono">
              Ready
            </span>
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'vercel'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-900" />
            <span>Vercel</span>
            <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full font-mono">
              Ready
            </span>
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'docker'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-4 h-4 text-sky-600" />
            <span>Docker & VPS</span>
            <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full font-mono">
              Compose
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pm2')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'pm2'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-600" />
            <span>Node.js / PM2</span>
          </button>
          <button
            onClick={() => setActiveTab('nginx')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'nginx'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4 text-emerald-600" />
            <span>Nginx Standalone</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-700">
          {/* NETLIFY TAB */}
          {activeTab === 'netlify' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-950">
                    File Konfigurasi Netlify Siap Pakai:
                  </p>
                  <p className="text-emerald-800">
                    Proyek ini sudah memiliki file <code className="font-mono bg-emerald-100 px-1 rounded">netlify.toml</code> dan <code className="font-mono bg-emerald-100 px-1 rounded">public/_redirects</code> sehingga perutean SPA (Single Page App) tidak akan mengalami 404 saat refresh.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Langkah Deploy ke Netlify:</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-slate-600">
                  <li>
                    Hubungkan repositori Git Anda ke <strong>Netlify Dashboard</strong> via <em>Add new site &gt; Import an existing project</em>.
                  </li>
                  <li>
                    Netlify akan otomatis mendeteksi:
                    <div className="mt-1 ml-4 bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800">
                      Build command: <strong>npm run build</strong><br />
                      Publish directory: <strong>dist</strong>
                    </div>
                  </li>
                  <li>
                    Klik <strong>Deploy site</strong>. Situs akan aktif dalam &lt; 1 menit dan mendapat SSL HTTPS gratis otomatis.
                  </li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Isi netlify.toml:</span>
                  <button
                    onClick={() => handleCopy(netlifyConfig, 'netlify')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    {copiedKey === 'netlify' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {netlifyConfig}
                </pre>
              </div>
            </div>
          )}

          {/* VERCEL TAB */}
          {activeTab === 'vercel' && (
            <div className="space-y-4">
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-950">
                    Konfigurasi Vercel Siap Pakai:
                  </p>
                  <p className="text-slate-700">
                    Proyek ini sudah dilengkapi file <code className="font-mono bg-white px-1 rounded border border-slate-200">vercel.json</code> yang mengonfigurasi SPA rewrites dan immutable cache untuk bundle Vite.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Langkah Deploy ke Vercel:</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-slate-600">
                  <li>
                    Buka <strong>Vercel Dashboard</strong> dan klik <strong>Add New... &gt; Project</strong>.
                  </li>
                  <li>
                    Pilih repositori ini dari GitHub / GitLab.
                  </li>
                  <li>
                    Vercel akan otomatis memilih preset <strong>Vite</strong> dengan output directory <code className="font-mono">dist</code>.
                  </li>
                  <li>
                    Klik <strong>Deploy</strong>. Selesai!
                  </li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Isi vercel.json:</span>
                  <button
                    onClick={() => handleCopy(vercelConfig, 'vercel')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 hover:text-slate-950"
                  >
                    {copiedKey === 'vercel' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {vercelConfig}
                </pre>
              </div>
            </div>
          )}

          {/* DOCKER TAB */}
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                <Box className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sky-950">
                    Multi-Stage Docker & Docker Compose Siap Pakai:
                  </p>
                  <p className="text-sky-800">
                    File <code className="font-mono bg-sky-100 px-1 rounded">Dockerfile</code> mengompilasi Vite dan menyajikan aplikasi dengan image ringan <strong>Nginx Alpine (&lt;25MB)</strong> yang super cepat dan aman untuk server on-premise perusahaan.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-sky-600" />
                    Perintah 1-Klik di Server Private:
                  </span>
                  <button
                    onClick={() => handleCopy(dockerComposeCmd, 'docker')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800"
                  >
                    {copiedKey === 'docker' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Perintah</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-sky-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {dockerComposeCmd}
                </pre>
                <p className="text-[11px] text-slate-500 mt-2">
                  Aplikasi akan otomatis online di <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">http://IP_SERVER:3000</code> dengan restart policy otomatis.
                </p>
              </div>
            </div>
          )}

          {/* PM2 TAB */}
          {activeTab === 'pm2' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Cpu className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-950">
                    Server Express Produksi (server.js):
                  </p>
                  <p className="text-amber-800">
                    Tersedia script <code className="font-mono bg-amber-100 px-1 rounded">server.js</code> yang dapat dijalankan langsung via Node.js dengan perintah <code className="font-mono bg-amber-100 px-1 rounded">npm start</code> dan di-manage menggunakan PM2.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-600" />
                    Menjalankan di VPS via PM2:
                  </span>
                  <button
                    onClick={() => handleCopy(pm2Cmd, 'pm2')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                  >
                    {copiedKey === 'pm2' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Perintah</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-amber-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {pm2Cmd}
                </pre>
              </div>
            </div>
          )}

          {/* NGINX TAB */}
          {activeTab === 'nginx' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <FileCode className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-950">
                    Nginx Standalone di Linux Server:
                  </p>
                  <p className="text-emerald-800">
                    Salin isi folder <code className="font-mono bg-emerald-100 px-1 rounded">dist/</code> ke direktori web server Anda (misal: <code className="font-mono bg-emerald-100 px-1 rounded">/var/www/rekap-material</code>) dan gunakan blok konfigurasi di bawah ini:
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Konfigurasi Virtual Host Nginx:</span>
                  <button
                    onClick={() => handleCopy(nginxConfig, 'nginx')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    {copiedKey === 'nginx' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Konfigurasi</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {nginxConfig}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Panduan lengkap tersimpan di file <strong className="font-mono text-slate-700">DEPLOYMENT.md</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors shadow-2xs"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
