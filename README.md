# 🎵 Generative Music Visualizer

<p align="center">
  Sebuah visualizer musik generatif <i>real-time</i> yang dibangun dengan Python untuk backend audio processing dan React (Vite) untuk frontend.
</p>
<p align="center">
  <a href="#fitur-utama">Fitur</a> •
  <a href="#teknologi-yang-digunakan">Teknologi</a> •
  <a href="#instalasi-dan-setup">Instalasi</a> •
  <a href="#menjalankan-aplikasi">Menjalankan</a> •
  <a href="#building-the-application">Build Aplikasi</a> •
  <a href="#cara-berkontribusi">Berkontribusi</a>
</p>

---

## ✨ Fitur Utama

- **Visualisasi Audio Real-time**: Menangkap audio dari input device (mic atau stereo mix) dan memvisualisasikannya secara langsung.
- **Deteksi Beat**: Menganalisis frekuensi bass untuk mendeteksi ketukan (beat) dalam musik, yang memicu munculnya bentuk baru.
- **Bentuk & Warna Generatif**: Setiap bentuk yang muncul memiliki jumlah sisi dan warna yang acak, menciptakan visual yang unik setiap saat.
- **UI Modern**: Antarmuka yang bersih dengan _dark mode_ dan panel pengaturan.
- **Sangat Interaktif**: Pengguna bisa memilih perangkat input audio dan menyesuaikan parameter visual seperti _pulse_, _decay rate_, dan jumlah maksimum bentuk.

---

## 💻 Teknologi yang Digunakan

<table>
  <tr>
    <td align="center"><strong>Frontend</strong></td>
    <td align="center"><strong>Backend</strong></td>
  </tr>
  <tr>
    <td>
			<br>
      React
    </td>
    <td>
      <br>
      Python
    </td>
  </tr>
  <tr>
    <td>
      <br>
      Vite
    </td>
    <td>
      <br>
      WebSockets
    </td>
  </tr>
  <tr>
    <td>
      <br>
      Tailwind CSS
    </td>
    <td>
      <br>
      NumPy
    </td>
  </tr>
</table>

---

## 🛠️ Instalasi dan Setup

Untuk menjalankan proyek ini di komputermu, ikuti langkah-langkah berikut.

### Prasyarat

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en/) (v18 atau lebih baru direkomendasikan)
- [Python](https://www.python.org/) (v3.8 atau lebih baru)

### Langkah-langkah

1.  **Clone repositori ini:**

    ```bash
    git clone [https://github.com/roubilibo/visualizer.git](https://github.com/roubilibo/visualizer.git)
    cd visualizer
    ```

2.  **Setup Backend (Server):**

    ```bash
    # Masuk ke direktori server
    cd server

    # Buat dan aktifkan virtual environment
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # Git-Bash/macOS/Linux:
     source venv/Scripts/activate

    # Install dependensi Python
    pip install -r requirements.txt
    ```

3.  **Setup Frontend (Client):**

    ```bash
    # Kembali ke root, lalu masuk ke direktori client
    cd ../client

    # Install dependensi Node.js
    npm install
    ```

---

## 🚀 Menjalankan Aplikasi

Kamu perlu menjalankan **dua terminal** secara bersamaan, satu untuk backend dan satu untuk frontend.

1.  **Terminal 1: Jalankan Backend Server**

    ```bash
    # Dari folder root 'visualizer'
    cd server
    # Pastikan venv aktif
    python main.py
    ```

    Server akan berjalan di `ws://localhost:8766`.

2.  **Terminal 2: Jalankan Frontend Client**
    ```bash
    # Dari folder root 'visualizer'
    cd client
    npm run dev
    ```
    Aplikasi React akan terbuka secara otomatis di browser pada `http://localhost:5173` (atau port lain jika 5173 sudah terpakai).

---

## 📦 Building the Application

Jika kamu ingin membuat aplikasi ini menjadi satu file executable yang bisa diinstal, ikuti langkah-langkah berikut. Proses ini menggabungkan backend Python dan frontend React menjadi satu paket.

### Prasyarat Tambahan

- [PyInstaller](https://pyinstaller.org/en/stable/): Untuk membundel skrip Python.
- **(Opsional tapi direkomendasikan)** [UPX](https://upx.github.io/): Untuk mengompresi file executable.

### Langkah-langkah Build

1.  **Build Backend Python:**
    Buka terminal di direktori `/server` (pastikan _virtual environment_ aktif) dan jalankan perintah berikut.

    ```bash
    # Install PyInstaller jika belum ada
    pip install pyinstaller

    # Jalankan build dengan nama output 'main'
    pyinstaller --name "main" --onefile --windowed main.py
    ```

    Ini akan menghasilkan file `main.exe` baru di dalam folder `server/dist/`.

2.  **Salin File Executable:**
    **Langkah ini sangat penting.** Konfigurasi build Electron akan mencari file `main.exe` langsung di dalam folder `/server`. Salin file yang baru dibuat dari `server/dist/main.exe` dan letakkan di `server/main.exe`, menimpa file lama jika ada.

    **Salin dari:** `server/dist/main.exe`
    **Tempel ke:** `server/main.exe`

3.  **Build Frontend & Paket Electron:**
    Setelah backend `.exe` disalin ke lokasi yang benar, buka terminal di direktori `/client` dan jalankan:

    ```bash
    # Perintah ini akan membangun aplikasi React dan membungkusnya dengan Electron
    npm run dist
    ```

4.  **Selesai!** 🎉
    Installer aplikasimu yang sudah jadi akan berada di folder `client/release/`.

---

## 🤝 Cara Berkontribusi

Kontribusi dari komunitas sangat kami hargai! Jika kamu tertarik untuk membantu, silakan ikuti alur berikut:

1.  **Fork** repositori ini.
2.  Buat **Branch** baru untuk fiturnya (`git checkout -b fitur/NamaFiturKeren`).
3.  **Commit** perubahan yang kamu buat (`git commit -m 'feat: Menambahkan NamaFiturKeren'`).
4.  **Push** ke branch tersebut (`git push origin fitur/NamaFiturKeren`).
5.  Buka **Pull Request**.

Beberapa ide untuk kontribusi:

- Menambah variasi bentuk geometris baru.
- Membuat skema warna yang bisa dipilih.
- Optimasi performa rendering pada canvas.
- Menambahkan efek visual lain seperti partikel atau _shader_.
