/* global process */
import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import treeKill from "tree-kill";

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

	pythonProcess = spawn(scriptPath);

	pythonProcess.stdout.on("data", (data) => {
		console.log(`[SERVER LOG]: ${data}`);
	});
	pythonProcess.stderr.on("data", (data) => {
		console.error(`[SERVER ERROR]: ${data}`);
	});
}

function killPythonProcess() {
	if (pythonProcess) {
		console.log(`Mematikan proses server Python dengan tree-kill, PID: ${pythonProcess.pid}`);
		treeKill(pythonProcess.pid, "SIGKILL", (err) => {
			if (err) {
				console.error("Gagal mematikan proses:", err);
			} else {
				console.log("Proses server Python berhasil dimatikan.");
			}
		});
		pythonProcess = null;
	}
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
		killPythonProcess();
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
	killPythonProcess();
});

app.on("window-all-closed", () => {
	killPythonProcess();
	if (process.platform !== "darwin") {
		app.quit();
	}
});
