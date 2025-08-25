import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCcw, SlidersHorizontal, Sun, Moon, Play, Pause, Maximize, Minimize } from "lucide-react";

const Shape = function (x, y) {
	this.x = x;
	this.y = y;
	this.radius = 30;
	this.numVertices = Math.floor(Math.random() * 8) + 3;
	this.rgb = [
		Math.floor(Math.random() * 255),
		Math.floor(Math.random() * 255),
		Math.floor(Math.random() * 255),
	];
	// Generate a second random color for gradient effect
	this.rgb2 = [
		Math.floor(Math.random() * 255),
		Math.floor(Math.random() * 255),
		Math.floor(Math.random() * 255),
	];
	this.lifespan = 255;
};

const App = () => {
	const [connectionStatus, setConnectionStatus] = useState("Connecting...");
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isPlaying, setIsPlaying] = useState(true);
	const [isGradientShapes, setIsGradientShapes] = useState(false);
	const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
	const [settings, setSettings] = useState({
		rhythmFactor: 0.05,
		decayRate: 0.98,
		maxShapes: 50,
	});
	const [audioDevices, setAudioDevices] = useState([]);
	const [selectedDevice, setSelectedDevice] = useState("");
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	const canvasRef = useRef(null);
	// Direct reference to canvas container for fullscreen functionality
	const canvasContainerRef = useRef(null);
	const shapesRef = useRef([]);
	const settingsRef = useRef(settings);
	const ws = useRef(null);
	const settingsPanelRef = useRef(null);
	const canvasDimensionsRef = useRef(canvasDimensions);
	canvasDimensionsRef.current = canvasDimensions;

	settingsRef.current = settings;
	
	// Listen for fullscreen changes to keep state in sync (handles ESC key)
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, []);
	
	// WebSocket connection and audio data handling
	useEffect(() => {
		const connectWebSocket = () => {
			ws.current = new WebSocket("ws://localhost:8766");

			ws.current.onopen = () => setConnectionStatus("Connected!");
			ws.current.onclose = () => {
				setConnectionStatus((prevStatus) => {
					const match = prevStatus.match(/\((\d)\/5\)/);
					let prev = match ? parseInt(match[1], 10) : 0;
					if (prev < 4) {
						setTimeout(connectWebSocket, 3000);
						return `Disconnected. Retrying... (${prev + 1}/5)`;
					} else if (prev === 4) {
						return "Disconnected. Retry limit reached. Please refresh to reconnect.";
					}
					return prevStatus;
				});
			};
			ws.current.onerror = (error) => console.error("WebSocket error:", error);

			ws.current.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);

					if (message.type === "device_list") {
						setAudioDevices(message.payload);
						if (message.payload.length > 0) {
							const defaultDevice =
								message.payload.find((d) => d.name.toLowerCase().includes("stereo mix")) ||
								message.payload[2];
							if (defaultDevice) {
								setSelectedDevice(defaultDevice.index);
							}
						}
					} else if (message.type === "audio_data") {
						const data = message.payload;
						const currentSettings = settingsRef.current;
						const currentDimensions = canvasDimensionsRef.current;

						let currentShapes = shapesRef.current;

						if (data.is_beat) {
							currentShapes.push(
								new Shape(currentDimensions.width / 2, currentDimensions.height / 2)
							);
							if (currentShapes.length > currentSettings.maxShapes) {
								shapesRef.current = currentShapes.slice(-currentSettings.maxShapes);
							}
						}
						shapesRef.current = currentShapes
							.map((shape) => ({
								...shape,
								radius:
									shape.radius +
									data.rhythm_factor * currentSettings.rhythmFactor * shape.radius -
									1,
								lifespan: shape.lifespan * currentSettings.decayRate,
							}))
							.filter((shape) => shape.lifespan > 1);
					}
				} catch (error) {
					console.error("Failed to parse WebSocket message:", error);
				}
			};
		};

		connectWebSocket();

		return () => {
			if (ws.current) ws.current.close();
		};
	}, []);

	// Animation loop for continuous rendering
	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		shapesRef.current.forEach((shape) => {
			ctx.beginPath();
			const points = [];
			for (let i = 0; i < shape.numVertices; i++) {
				const angle = (2 * Math.PI * i) / shape.numVertices;
				const x = shape.x + shape.radius * Math.cos(angle);
				const y = shape.y + shape.radius * Math.sin(angle);
				points.push({ x, y });
			}

			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.closePath();

			if (isGradientShapes) {
				// Create gradient for enhanced visual effect
				const gradient = ctx.createLinearGradient(
					shape.x - shape.radius, 
					shape.y,  
					shape.x + shape.radius, 
					shape.y   
				);

				const [r1, g1, b1] = shape.rgb;
				const [r2, g2, b2] = shape.rgb2;
				const opacity = shape.lifespan > 180 ? 1.0 : Math.max(0.6, shape.lifespan / 120);
				
				gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, ${opacity})`);
				gradient.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, ${opacity})`);
				
				ctx.strokeStyle = gradient;
			} else {
				// Use single color for better performance
				const [r, g, b] = shape.rgb;
				ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${shape.lifespan / 255})`;
			}
			
			ctx.stroke();
		});
	}, [isGradientShapes]);

	useEffect(() => {
		let animationFrameId;

		const animationLoop = () => {
			draw();
			animationFrameId = requestAnimationFrame(animationLoop);
		};

		if (isPlaying) {
			animationLoop();
		}

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, [isPlaying, draw]);

	// Handle clicking outside settings panel to close it
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target)) {
				setIsSettingsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Handle canvas resizing
	useEffect(() => {
		const handleResize = () => {
			const canvas = canvasRef.current;
			if (canvas) {
				setCanvasDimensions({
					width: canvas.parentElement.clientWidth,
					height: canvas.parentElement.clientHeight,
				});
			}
		};
		window.addEventListener("resize", handleResize);
		handleResize();
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Event handlers
	const handleSliderChange = (key, value) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	};

	const handleDeviceChange = (e) => {
		const newDeviceIndex = parseInt(e.target.value, 10);
		setSelectedDevice(e.target.value);

		if (ws.current && ws.current.readyState === WebSocket.OPEN) {
			ws.current.send(
				JSON.stringify({
					type: "select_device",
					payload: { index: newDeviceIndex },
				})
			);
		}
	};

	const handleToggleSettings = () => setIsSettingsOpen((prev) => !prev);
	const handleToggleDarkMode = () => setIsDarkMode((prev) => !prev);
	
	// Updated fullscreen function to use direct ref
	const handleToggleFullscreen = () => {
		if (!document.fullscreenElement) {
			canvasContainerRef.current?.requestFullscreen().catch(err => {
				console.log("Error entering fullscreen:", err);
			});
		} else {
			document.exitFullscreen().catch(err => {
				console.log("Error exiting fullscreen:", err);
			});
		}
	};
	
	const handleTogglePlayPause = () => setIsPlaying((prev) => !prev);
	const handleGradientShapes = () => setIsGradientShapes((prev) => !prev);

	const handleReset = () => {
		shapesRef.current = [];
	};

	return (
		<div
			className={`flex flex-col items-center justify-center min-h-screen p-4 font-sans transition-colors duration-500 ${
				isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"
			}`}>
			{/* UI Controls: Play, Pause, Reset */}
			<div className="absolute top-4 left-4 z-10 flex space-x-2">
				<button
					onClick={handleTogglePlayPause}
					className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
					{isPlaying ? <Pause size={20} /> : <Play size={20} />}
				</button>
				<button
					onClick={handleReset}
					className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
					<RefreshCcw size={20} />
				</button>
			</div>

			{/* UI Controls: Dark Mode, Fullscreen, Settings */}
			<div className="absolute top-4 right-4 z-10 flex space-x-2">
				<button
					onClick={handleToggleDarkMode}
					className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
					{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
				</button>
				<button
					onClick={handleToggleFullscreen}
					className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
					{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
				</button>
				<div className="relative group" ref={settingsPanelRef}>
					<button
						onClick={handleToggleSettings}
						className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
						<SlidersHorizontal size={20} />
					</button>
					<div
						className={`absolute top-12 right-0 w-80 p-4 rounded-2xl shadow-2xl transition-all duration-300 transform bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
							isSettingsOpen
								? "scale-100 opacity-100 pointer-events-auto"
								: "scale-95 opacity-0 pointer-events-none"
						}`}>
						<div className="grid gap-4">
							<div className="space-y-2">
								<h4 className="font-medium leading-none">Settings</h4>
								<p className="text-sm text-gray-500">Adjust visualizer parameters.</p>
							</div>
							<div className="grid gap-3">
								<div>
									<label className="text-sm font-medium">Audio Input</label>
									<select
										value={selectedDevice}
										onChange={handleDeviceChange}
										disabled={audioDevices.length === 0}
										className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 outline-none">
										{audioDevices.length === 0 ? (
											<option>Loading devices...</option>
										) : (
											audioDevices.map((device) => (
												<option key={device.index} value={device.index}>
													{device.name}
												</option>
											))
										)}
									</select>
								</div>
								<div>
									<label className="text-sm">
										Rhythm Pulse ({settings.rhythmFactor.toFixed(2)})
									</label>
									<input
										type="range"
										min="0.005"
										max="0.2"
										step="0.005"
										value={settings.rhythmFactor}
										onChange={(e) => handleSliderChange("rhythmFactor", parseFloat(e.target.value))}
										className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
									/>
								</div>
								<div>
									<label className="text-sm">Decay Rate ({settings.decayRate.toFixed(3)})</label>
									<input
										type="range"
										min="0.9"
										max="0.999"
										step="0.001"
										value={settings.decayRate}
										onChange={(e) => handleSliderChange("decayRate", parseFloat(e.target.value))}
										className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
									/>
								</div>
								<div>
									<label className="text-sm">Max Shapes ({settings.maxShapes})</label>
									<input
										type="range"
										min="10"
										max="200"
										step="10"
										value={settings.maxShapes}
										onChange={(e) => handleSliderChange("maxShapes", parseInt(e.target.value))}
										className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
									/>
								</div>
								{/* Gradient shapes toggle */}
								<div className="flex items-center space-x-2">
									<div className="relative">
										<input
											type="checkbox"
											checked={isGradientShapes}
											onChange={handleGradientShapes}
											className="sr-only"
											id="gradient-toggle"
										/>
										<label
											htmlFor="gradient-toggle"
											className={`flex items-center justify-center w-4 h-4 border-2 rounded cursor-pointer transition-colors duration-200 ${
												isGradientShapes
													? 'bg-blue-500 border-blue-500'
													: 'bg-transparent border-gray-400 dark:border-gray-500'
											}`}
										>
											{isGradientShapes && (
												<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
												</svg>
											)}
										</label>
									</div>
									<label htmlFor="gradient-toggle" className="text-sm cursor-pointer">Gradient Shapes</label>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Canvas for Visualizer */}
			<div 
				ref={canvasContainerRef}
				className={`relative w-full max-w-5xl aspect-video overflow-hidden rounded-3xl shadow-2xl border-2 border-transparent ${
					isDarkMode ? "bg-gray-900" : "bg-gray-100"
				}`}>
				{/* Minimize button that only appears when in fullscreen mode */}
				{isFullscreen && (
					<button
						onClick={handleToggleFullscreen}
						className="absolute top-4 right-4 z-20 p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
						<Minimize size={20} />
					</button>
				)}
				<canvas
					ref={canvasRef}
					width={canvasDimensions.width}
					height={canvasDimensions.height}
					className="absolute top-0 left-0 w-full h-full"
				/>
			</div>

			{/* Status Info */}
			<div
				className={`mt-8 w-full max-w-xl rounded-2xl shadow-xl p-6 transition-colors duration-300 ${
					isDarkMode
						? "bg-gray-800 border-gray-700 text-gray-100"
						: "bg-white border-gray-200 text-gray-900"
				}`}>
				<h2 className="text-2xl font-bold">Generative Music Visualizer</h2>
				<p className="text-sm text-gray-500 mt-2">{connectionStatus}</p>
			</div>
		</div>
	);
};

export default App;