# RuangRapi

RuangRapi adalah dashboard ringan untuk tim kreatif kecil. Kelola daftar tugas, tenggat, prioritas, status, dan penanggung jawab dalam satu ruang kerja.

## Fitur

- CRUD tugas: buat, lihat, cari/filter, edit, dan hapus.
- Perubahan tersimpan otomatis di `localStorage` browser.
- Layout responsif, navigasi keyboard, label formulir, dan dialog native yang aksesibel.
- Data contoh langsung tersedia untuk mencoba dashboard.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Validasi

```bash
npm run lint
npm run build
```

Build Next.js menghasilkan situs statis ke folder `out`, sehingga bisa di-deploy langsung ke Vercel:

```bash
npx vercel login
npm run build
npx vercel deploy ./out --prod
```

## Bukti CRUD (localhost)

**Review / Read**

![Daftar tugas di RuangRapi](./public/screenshots/review.png)

**Create**

![Tugas baru berhasil dibuat](./public/screenshots/create.png)

**Update**

![Tugas berhasil diperbarui](./public/screenshots/update.png)

**Delete**

![Tugas berhasil dihapus](./public/screenshots/delete.png)
