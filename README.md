ini adalah project iseng myvisualizer 

langkah develop server
- Selesaikan koding di server/main.py.
- Buka terminal di folder server, aktifkan venv. `source venv/Scripts/activate`
- Jalankan `pyinstaller --onefile --windowed main.py.`
- Salin server/dist/main.exe ke server/main.exe (timpa yang lama).

langkah build electron 
- masuk ke client
- jalankan `npm run build` untuk build react
- jalankan `npn run dist` untuk build menjadi apk
Buka terminal di folder client, jalankan npm run dist untuk mem-bundle aplikasi Electron-mu.
