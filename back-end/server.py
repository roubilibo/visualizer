import pyaudio
import numpy as np
import asyncio
import websockets
import json

# Audio stream parameters
CHUNK = 2046
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100

# Beat and rhythm detection variables
BEAT_VELOCITY_THRESHOLD = 5000
last_bass_energy = 0
last_beat_trigger = 0

async def audio_processor(websocket, stream):
    """
    This function processes the audio and sends the data over the WebSocket.
    It runs the blocking stream.read() call in a separate thread.
    """
    global last_bass_energy, last_beat_trigger
    print(f"WebSocket client connected!")
    loop = asyncio.get_event_loop()

    try:
        while True:
            data = await loop.run_in_executor(
                None, stream.read, CHUNK, False
            )
            
            numpy_data = np.frombuffer(data, dtype=np.int16)
            
            fft_data = np.fft.fft(numpy_data)
            fft_magnitude = np.abs(fft_data)[:CHUNK // 2]
            
            frequencies = np.fft.fftfreq(len(numpy_data), 1.0 / RATE)[:CHUNK // 2]
            
            bass_band = (frequencies >= 20) & (frequencies < 250)
            mids_band = (frequencies >= 250) & (frequencies < 4000)
            
            bass_energy = np.mean(fft_magnitude[bass_band]) if np.any(bass_band) else 0
            mids_energy = np.mean(fft_magnitude[mids_band]) if np.any(mids_band) else 0
            
            bass_velocity = bass_energy - last_bass_energy
            last_bass_energy = bass_energy
            
            is_beat = False
            current_time_ms = asyncio.get_event_loop().time() * 1000
            if bass_velocity > BEAT_VELOCITY_THRESHOLD and current_time_ms - last_beat_trigger > 200:
                is_beat = True
                last_beat_trigger = current_time_ms

            normalized_mids = min(mids_energy / 10000, 1)

            audio_data = {
                "is_beat": is_beat,
                "rhythm_factor": normalized_mids
            }
            
            await websocket.send(json.dumps(audio_data))

    except websockets.exceptions.ConnectionClosed:
        print("WebSocket client disconnected.")
    except Exception as e:
        print(f"An error occurred in audio_processor: {e}")

async def main():
    """
    Main function to initialize PyAudio and start the WebSocket server.
    """
    print("Daftar input device:")
    p = pyaudio.PyAudio()
    for i in range(p.get_device_count()):
        info = p.get_device_info_by_index(i)
        if info["maxInputChannels"] > 0:
            print(f"Index {i}: {info['name']} (Channels: {info['maxInputChannels']})")
    print("Selesai menampilkan daftar device.\n")

    print("After PyAudio init")

    # Ganti 'input_device_index=2' jika mau pakai Stereo Mix
    # Kosongkan untuk pakai mic default
    print("Before stream open")
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK,
                    input_device_index=2)
    
    stream.start_stream()
    print("Audio stream started.")

    async def handler(websocket):
        print("Handler called!")
        await audio_processor(websocket, stream)

    try:
        async def process_request(path, request):
            if "Upgrade" not in request.headers:
                return (426, [("Content-Type", "text/plain")], b"WebSocket endpoint.\n")
            return None

        async with websockets.serve(handler, "localhost", 8766, process_request=process_request):
            print("Server started on ws://localhost:8766")
            await asyncio.Future()
    finally:
        print("Server is shutting down. Cleaning up resources.")
        stream.stop_stream()
        stream.close()
        p.terminate()
        print("Audio resources cleaned up.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user.")