import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const distPath = path.join(__dirname, 'dist');

// Check if build directory exists
if (!fs.existsSync(distPath)) {
  console.warn('\n⚠️  PERINGATAN: Direktori "dist/" belum ditemukan.');
  console.warn('   Silakan jalankan "npm run build" terlebih dahulu sebelum menjalankan server produksi.\n');
}

// Serve static assets with cache headers
app.use(express.static(distPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Immutable cache for fingerprinted Vite assets
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Health check endpoint for container orchestrators (Docker / Kubernetes / PM2)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback: send index.html for any client-side routes
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Build not found. Please run "npm run build" first.');
  }
});

const server = app.listen(Number(PORT), HOST, () => {
  console.log(`\n🚀 Rekap Material Mesin berjalan di http://${HOST}:${PORT}`);
  console.log(`   Mode: Production (Server Private / Docker / Node.js)`);
  console.log(`   Healthcheck: http://${HOST}:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
