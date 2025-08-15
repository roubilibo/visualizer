/* global process */
// client/electron/main.js (Versi ES Module)

import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import { spawn, exec } from "child_process";
import { fileURLToPath } from "url"; // Helper untuk __dirname

// Di ES Modules, __dirname tidak tersedia secara default. Ini cara modern untuk mendapatkannya.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pythonProcess = null;

function createPythonServer() {
	// Dapatkan path ke folder 'server' yang sudah di-bundle
	const serverPath = app.isPackaged
		? path.join(process.resourcesPath, "server")
		: path.join(__dirname, "../../server");

	// Tentukan nama file eksekusi berdasarkan OS
	const exeName = process.platform === "win32" ? "main.exe" : "main";
	const scriptPath = path.join(serverPath, exeName);

	console.log(`Menjalankan executable server di: ${scriptPath}`);

	// Jalankan file .exe-nya langsung!
	pythonProcess = spawn(scriptPath);

	pythonProcess.stdout.on("data", (data) => {
		console.log(`[SERVER LOG]: ${data}`);
	});
	pythonProcess.stderr.on("data", (data) => {
		console.error(`[SERVER ERROR]: ${data}`);
	});
}

function createWindow() {
	Menu.setApplicationMenu(null);
	const win = new BrowserWindow({
		width: 450,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	const startUrl = app.isPackaged
		? `file://${path.join(__dirname, "../dist/index.html")}`
		: "http://localhost:5173";

	win.loadURL(startUrl);

	if (!app.isPackaged) {
		win.webContents.openDevTools();
	}

	win.on("closed", () => {
		console.log("Jendela utama ditutup, mencoba mematikan server Python...");
		if (pythonProcess) {
			// Kita gunakan lagi perintah 'taskkill' yang sudah terbukti andal
			if (process.platform === "win32") {
				console.log(`Menggunakan taskkill untuk PID: ${pythonProcess.pid}`);
				exec(`taskkill /PID ${pythonProcess.pid} /F /T`, (error, stdout) => {
					if (error) {
						console.error(`Gagal mematikan proses saat jendela ditutup: ${error}`);
						return;
					}
					console.log(`Proses berhasil dimatikan dari event 'closed': ${stdout}`);
				});
			} else {
				pythonProcess.kill();
			}
			pythonProcess = null;
		}
	});
}

app.whenReady().then(() => {
	console.log("Aplikasi siap, memulai server Python...");
	createPythonServer();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("will-quit", () => {
	console.log("Aplikasi akan ditutup, mematikan server Python...");
	if (pythonProcess) {
		if (process.platform === "win32") {
			console.log(`Menggunakan taskkill untuk PID: ${pythonProcess.pid}`);
			exec(`taskkill /PID ${pythonProcess.pid} /F /T`, (error, stdout) => {
				if (error) {
					console.error(`Gagal mematikan proses: ${error}`);
					return;
				}
				console.log(`Proses berhasil dimatikan: ${stdout}`);
			});
		} else {
			pythonProcess.kill();
		}
		pythonProcess = null;
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
