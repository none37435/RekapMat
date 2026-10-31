import React, { useState } from 'react';
import { BookOpen, ShieldCheck, FileText, CheckCircle2, AlertOctagon, Printer, Camera } from 'lucide-react';

export const SOPModule: React.FC = () => {
  const [activeRole, setActiveRole] = useState<'adminOperator' | 'foreman'>('adminOperator');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Role Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Modul Onboarding & Standar Operasional Prosedur (SOP) Manufaktur
              </h2>
              <p className="text-xs text-slate-500">
                Pedoman Teknis Operasional Departemen Produksi Kain Kasa Medis (Kasa Lipat & Kasa Roll)
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors print:hidden"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setActiveRole('adminOperator')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeRole === 'adminOperator'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1. Admin & Operator Material Mesin (Kasa Lipat & Roll)
          </button>
          <button
            onClick={() => setActiveRole('foreman')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeRole === 'foreman'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Foreman / Pengawas Lapangan Shift Produksi
          </button>
        </div>
      </div>

      {activeRole === 'adminOperator' ? (
        /* ROLE 1: Admin & Operator Material Mesin */
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          {/* Bagian 1: Deskripsi Peran */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">1</span>
              <h3>Deskripsi Peran & Alur Koordinasi</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Admin & Operator Material Mesin</strong> bertanggung jawab penuh dalam memastikan seluruh kebutuhan bahan baku kain kasa untuk lini mesin <em>Kasa Lipat</em> dan <em>Kasa Roll</em> tersedia tepat waktu, tepat kuantitas, dan sesuai spesifikasi teknis (lebar kain, jenis lipatan, dan nomor batch/MR).
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Alur Koordinasi Lintas Divisi:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li><strong>Dengan PPIC:</strong> Menerima file rencana jadwal produksi mingguan/harian (.xlsx) dan mengonfirmasi nomor SPK/MR.</li>
                <li><strong>Dengan Gudang Bahan Baku (Warehouse):</strong> Melakukan serah terima roll kain, pengecekan nomor identitas palet (Palet 1, 2, 3, 4), dan klaim stok sisa slit (S0771).</li>
                <li><strong>Dengan Operator Mesin (Slitting, Folding, Cutting):</strong> Memastikan bahan siap di dekat mesin sebelum shift berjalan dan mencatat status pengerjaan (<em>Sudah/Sambung/Belum</em>).</li>
                <li><strong>Dengan Foreman / Shift Berikutnya:</strong> Menyerahkan fisik sisa bahan dan laporan rekapitulasi data digital.</li>
              </ul>
            </div>
          </section>

          {/* Bagian 2: Alat Kerja & Sistem */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">2</span>
              <h3>Alat Kerja, Sistem & Alat Pelindung Diri (APD)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Perangkat Lunak & Sistem</span>
                <ul className="space-y-1 text-slate-600">
                  <li>• Aplikasi Rekap Material Mesin (Web System)</li>
                  <li>• Microsoft Excel / Google Sheets (.xlsx)</li>
                  <li>• ERP Manufaktur / Modul Inventory</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Dokumen Fisik & Formulir</span>
                <ul className="space-y-1 text-slate-600">
                  <li>• Formulir Bukti Permintaan Bahan (No. MR)</li>
                  <li>• Kartu Identitas Palet & Batch Material</li>
                  <li>• Logbook Serah Terima Shift Manual</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Standar APD Ruang Bersih</span>
                <ul className="space-y-1 text-slate-600">
                  <li>• Masker Medis 3-Ply (Wajib)</li>
                  <li>• Hairnet / Penutup Rambut (Wajib)</li>
                  <li>• Sarung Tangan Katun/Lateks bebas debu</li>
                  <li>• Safety Shoes antiselip ruang produksi</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Bagian 3: Panduan Alur Kerja Langkah-demi-Langkah */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">3</span>
              <h3>Panduan Alur Kerja Langkah-demi-Langkah (Step-by-Step)</h3>
            </div>

            {/* Sub-tahap A: Awal Shift */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                A. Aktivitas Awal Shift (Persiapan & Cek Administrasi)
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li>Gunakan APD lengkap sebelum memasuki area produksi dan ruang mesin kain kasa.</li>
                <li>Buka komputer kerja, login ke Aplikasi Rekap Material Mesin, dan muat jadwal terbaru dengan mengklik tombol <strong>Upload .xlsx</strong>.</li>
                <li><strong>Pengecekan Bagian Folding & Cutting:</strong> Sistem secara bawaan selalu mengabaikan kolom folding dan cutting dari file Excel. Tinjau kolom <em>Keterangan pada File Excel</em> di modal untuk memutuskan apakah stasiun folding/cutting membutuhkan persiapan bahan baku pada shift tersebut.</li>
                <li>Periksa data sisa bahan dari shift sebelumnya: periksa fisik kain kasa di Palet 2, Palet 3, dan Palet 4. Pastikan label fisik cocok dengan catatan kode produk (misal: S0001, S0896 sisa S0771).</li>
                <li>Cocokkan daftar bahan baku bersumber <strong>SGC</strong>, <strong>MR</strong>, dan <strong>PLESTER</strong> dengan stok fisik di area penampungan mesin.</li>
              </ol>

              {/* Placeholder Gambar 1 */}
              <div className="mt-2 p-3 bg-amber-50/80 rounded-lg border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">[GAMBAR 1: Tampilan Layar Dialog Impor File Excel dan Panel Keputusan Folding & Cutting Beserta Keterangan Asli]</span>
                  <span className="text-[11px] text-amber-900 block mt-0.5">
                    Screenshot layar modal upload file Excel. Berikan tanda panah merah ke tombol 'Upload .xlsx' serta kotak kuning pada panel deteksi Folding & Cutting yang menyoroti kolom keterangan asli dari file Excel.
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-tahap B: Operasional Utama */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                B. Operasional Utama (Input, Rekonsiliasi, Monitoring)
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li>Buka tab <strong>Rekap Material Mesin</strong> dan saring berdasarkan hari kerja aktif (misal: <em>Senin</em>).</li>
                <li>Saat kain kasa diserahkan ke operator stasiun Slitting atau Cutting, periksa nomor MR fisik. Jika sudah lengkap, input nomor MR ke kolom <strong>No. MR</strong> (contoh: <code>MR.261009.0008</code>).</li>
                <li>Setelah operator mesin menyelesaikan proses produksi pada item terkait, segera ubah kolom <strong>Status</strong> dari <code>Belum</code> menjadi <code>Sudah</code>. Sistem secara otomatis mencatat nama operator dan waktu timestamp penyelesaian.</li>
                <li>Untuk pesanan sambungan (misal: <code>24x 20 (s)</code> pada produk S0018, S0144), ubah status menjadi <code>Sambung</code> selama proses pengerjaan wrapper berlangsung.</li>
                <li>Bila terdapat alokasi campuran bahan (misal: plester 4.000 + MR 2.000 pada S0678), klik ikon highlighter kuning agar baris tersebut menjadi prioritas visual bagi supervisor.</li>
              </ol>

              {/* Placeholder Gambar 2 */}
              <div className="mt-2 p-3 bg-amber-50/80 rounded-lg border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">[GAMBAR 2: Formulir Fisik Bukti Permintaan Bahan (No. MR) dan Kolom Input No. MR di Aplikasi]</span>
                  <span className="text-[11px] text-amber-900 block mt-0.5">
                    Foto perbandingan berdampingan: sebelah kiri foto dokumen formulir fisik No. MR bertanda tangan pengawas, sebelah kanan screenshot baris tabel aplikasi dengan panah petunjuk ke kolom 'No. MR'.
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-tahap C: Akhir Shift */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                C. Aktivitas Akhir Shift (Laporan & Serah Terima)
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li>Buka tab <strong>Rekapitulasi Otomatis</strong>, periksa kartu KPI persentase penyelesaian kuantitas shift.</li>
                <li>Tinjau tabel <em>Outstanding Watchlist</em> untuk memastikan seluruh item berstatus <code>Belum</code> memiliki catatan lokasi fisik yang jelas untuk shift berikutnya.</li>
                <li>Klik tombol <strong>Salin Format Laporan (WA)</strong>, tempelkan ke grup WhatsApp operasional pabrik sebagai laporan serah terima resmi.</li>
                <li>Klik tombol <strong>Ekspor Excel</strong> untuk menyimpan cadangan berkas <code>.xlsx</code> harian ke komputer kerja.</li>
                <li>Lakukan verifikasi fisik langsung di palet bersama staf shift pengganti sebelum meninggalkan area kerja.</li>
              </ol>

              {/* Placeholder Gambar 3 */}
              <div className="mt-2 p-3 bg-amber-50/80 rounded-lg border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">[GAMBAR 3: Label Fisik Identitas Palet Penyimpanan Sisa Slit di Palet 2 & 3]</span>
                  <span className="text-[11px] text-amber-900 block mt-0.5">
                    Foto kondisi fisik tumpukan kain kasa di atas palet kayu bernomor 'PALET NO 2' dengan label identitas berisi kode S0018, kuantitas sisa, dan paraf petugas pemeriksa.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Bagian 4: Masalah Umum & Solusi */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">4</span>
              <h3>Kendala Operasional Umum & Tindakan Korektif (Troubleshooting)</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold mb-1">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Kendala 1: Nomor MR Belum Terbit dari Bagian PPIC</span>
                </div>
                <p className="text-slate-700">
                  <strong>Penyebab:</strong> Permintaan tambahan kuantitas mendadak atau persetujuan form di sistem ERP tertunda.<br />
                  <strong>Solusi:</strong> Pertahankan status <code>Belum</code>, tambahkan catatan <em>'Menunggu TTD PPIC'</em> di kolom keterangan, dan segera hubungi supervisor shift. Dilarang memotong kain sebelum form MR disetujui.
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold mb-1">
                  <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Kendala 2: Selisih Kuantitas Potong (Cutting) dengan Rencana Roll</span>
                </div>
                <p className="text-slate-700">
                  <strong>Penyebab:</strong> Penyusutan kain pada saat proses slitting atau afval tepi melebihi toleransi standar (2%).<br />
                  <strong>Solusi:</strong> Perbarui angka aktual di tabel Rencana Proses Harian kolom <em>Cutting</em>. Jika jumlah kurang, ubah status material menjadi <code>Kurang</code> dan buat memo permohonan roll tambahan.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold mb-1">
                  <AlertOctagon className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Kendala 3: Sisa Roll Sambung (Wrapper) Berceceran di Luar Palet</span>
                </div>
                <p className="text-slate-700">
                  <strong>Penyebab:</strong> Operator stasiun sambung tidak mengembalikan roll sisa ke palet terdaftar.<br />
                  <strong>Solusi:</strong> Wajib membungkus ulang dengan plastik PE bersih, beri label batch, dan letakkan kembali ke <em>Palet 3 & 4</em> sesuai catatan di aplikasi.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* ROLE 2: Foreman / Pengawas Lapangan */
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          {/* Bagian 1: Deskripsi Peran Foreman */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">1</span>
              <h3>Deskripsi Peran & Tanggung Jawab Pengawas Shift</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Foreman Produksi</strong> bertanggung jawab mengawasi kelancaran eksekusi rencana kerja mesin harian (Slitting, Folding, Cutting, Sambung, Inspection), memastikan kepatuhan GMP (Good Manufacturing Practices) ruang bersih medis, mengesahkan formulir MR, serta mengawal pencapaian target efisiensi kuantitas shift ($\ge 95\%$).
            </p>
          </section>

          {/* Bagian 2: Alat Kerja Pengawas */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">2</span>
              <h3>Alat Kerja & Validasi Dokumen Mutu</h3>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Tablet / Laptop pengawas untuk memonitor dashboard rekapitulasi secara berkala per 2 jam kerja.</li>
                <li>Formulir Rekonsiliasi Hasil Produksi & Afval (Loss Percentage Form).</li>
                <li>Stempel persetujuan validasi nomor MR (Material Requisition Approval Stamp).</li>
              </ul>
            </div>
          </section>

          {/* Bagian 3: Alur Kerja Pengawas */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-mono font-bold">3</span>
              <h3>Alur Pengawasan Shift (Briefing s/d Evaluasi)</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Awal Shift: Morning / Shift Briefing</span>
                <p>Kumpulkan seluruh operator stasiun Slitting, Folding, dan Cutting. Bacakan target harian dari tabel Rencana Proses Harian. Soroti produk khusus berkode sambung atau ukuran non-standar (misal: <code>24x 17 Lebar 18 cm</code>).</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Mid-Shift: Patroli Kualitas & Bottleneck Mesin</span>
                <p>Periksa kecepatan pengerjaan folding dan cutting. Jika stasiun Folding terhambat pada kode S0003 (target 10.000 pcs), lakukan re-alokasi tenaga kerja dari stasiun inspection yang telah selesai.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Akhir Shift: Sign-off & Verifikasi Laporan Digital</span>
                <p>Verifikasi bahwa data di tabel Rekap Material Mesin telah sesuai dengan fisik hasil jadi di area transit barang sebelum dikirim ke ruang sterilisasi/packing.</p>
              </div>
            </div>

            {/* Placeholder Gambar 4 */}
            <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">[GAMBAR 4: Papan Informasi Jadwal Kerja Mesin di Lantai Produksi (Visual Control Board)]</span>
                <span className="text-[11px] text-amber-900 block mt-0.5">
                  Foto papan tulis / display whiteboard di lantai produksi yang menampilkan target kuantitas harian per mesin lengkap dengan status checklist paraf Foreman Shift.
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
