import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, SlidersHorizontal, Sun, Moon, Play, Pause } from 'lucide-react';

// This is a simple class to represent an individual shape
const Shape = function(x, y) {
  this.x = x;
  this.y = y;
  this.radius = 0;
  this.numVertices = Math.floor(Math.random() * 8) + 3;
  this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`;
  this.lifespan = 255;
};

// The main application component
const App = () => {
  const canvasRef = useRef(null);
  const [shapes, setShapes] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const [settings, setSettings] = useState({
    rhythmFactor: 0.05,
    decayRate: 0.98,
    maxShapes: 50,
  });

  const ws = useRef(null);
  const animationFrameId = useRef(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const connectWebSocket = () => {
    ws.current = new WebSocket('ws://localhost:8766');
    ws.current.onopen = () => {
      setConnectionStatus('Connected!');
      console.log('Connected to WebSocket server');
    };
    ws.current.onclose = () => {
      setConnectionStatus('Disconnected. Retrying...');
      console.log('Disconnected from WebSocket server');
      setTimeout(connectWebSocket, 3000);
    };
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.replace(/'/g, '"'));
        const currentSettings = settingsRef.current;
        
        if (data.is_beat) {
          setShapes(prevShapes => {
            const newShapes = [...prevShapes, new Shape(canvasDimensions.width / 2, canvasDimensions.height / 2)];
            return newShapes.slice(-currentSettings.maxShapes);
          });
        }
        setShapes(prevShapes => prevShapes.map(shape => {
          const newRadius = shape.radius + (data.rhythm_factor * currentSettings.rhythmFactor * shape.radius) - 1;
          const newLifespan = shape.lifespan * currentSettings.decayRate;
          return {
            ...shape,
            radius: newRadius,
            lifespan: newLifespan
          };
        }));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  useEffect(() => {
    connectWebSocket();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws.current) ws.current.close();
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setCanvasDimensions({ width: canvas.clientWidth, height: canvas.clientHeight });
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const updatedShapes = [];
    shapes.forEach(shape => {
      if (shape.lifespan > 1) {
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
        
        const [r, g, b] = shape.color.match(/\d+/g).map(Number);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${shape.lifespan / 255})`;
        ctx.stroke();
        updatedShapes.push(shape);
      }
    });

    setShapes(updatedShapes);
    animationFrameId.current = requestAnimationFrame(draw);
  };
  
  useEffect(() => {
    if (isPlaying) {
      animationFrameId.current = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(animationFrameId.current);
    }
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [isPlaying, shapes]);

  const handleSliderChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleDarkMode = () => setIsDarkMode(prev => !prev);
  const handleTogglePlayPause = () => setIsPlaying(prev => !prev);
  const handleReset = () => setShapes([]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 font-sans transition-colors duration-500 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button onClick={handleTogglePlayPause} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={handleReset} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
          <RefreshCcw size={20} />
        </button>
      </div>
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button onClick={handleToggleDarkMode} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="relative group">
          <button className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
            <SlidersHorizontal size={20} />
          </button>
          <div className="absolute top-12 right-0 w-80 p-4 rounded-2xl shadow-2xl transition-all duration-300 transform scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Settings</h4>
                <p className="text-sm text-gray-500">Adjust visualizer parameters.</p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Rhythm Pulse ({settings.rhythmFactor.toFixed(2)})</label>
                <input
                  type="range"
                  min="0.005"
                  max="0.2"
                  step="0.005"
                  value={settings.rhythmFactor}
                  onChange={(e) => handleSliderChange('rhythmFactor', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <label className="text-sm">Decay Rate ({settings.decayRate.toFixed(3)})</label>
                <input
                  type="range"
                  min="0.9"
                  max="1"
                  step="0.001"
                  value={settings.decayRate}
                  onChange={(e) => handleSliderChange('decayRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <label className="text-sm">Max Shapes ({settings.maxShapes})</label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={settings.maxShapes}
                  onChange={(e) => handleSliderChange('maxShapes', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-5xl aspect-video overflow-hidden rounded-3xl shadow-2xl border-2 border-gray-700">
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>

      <div className={`mt-8 w-full max-w-xl rounded-2xl shadow-xl p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}>
        <h2 className="text-2xl font-bold">Generative Music Visualizer</h2>
        <p className="text-sm text-gray-500 mt-2">
          {connectionStatus}
        </p>
      </div>
    </div>
  );
};

export default App;
