import pyaudio
import numpy as np
import asyncio
import websockets
import json
import logging
from collections import deque

# Setup logging
logging.basicConfig(level=logging.INFO)

CHUNK = 2048 
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100

BEAT_HISTORY_SIZE = 30 
BEAT_THRESHOLD_MULTIPLIER = 1.3
beat_history = deque(maxlen=BEAT_HISTORY_SIZE)
last_beat_trigger = 0

audio_state = {
    "p": None,
    "stream": None,
    "audio_processor_task": None,
    "current_device_index": None 
}

def get_input_devices(p_instance):
    """Gets a list of available audio input devices."""
    devices = []
    for i in range(p_instance.get_device_count()):
        info = p_instance.get_device_info_by_index(i)
        if info["maxInputChannels"] > 0:
            devices.append({"index": i, "name": info["name"]})
    return devices

def start_audio_stream(p_instance, device_index):
    """Opens and starts a new audio stream based on a device index."""
    try:
        stream = p_instance.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
            input_device_index=device_index
        )
        stream.start_stream()
        device_name = p_instance.get_device_info_by_index(device_index)['name'] if device_index is not None else "Default Device"
        logging.info(f"Audio stream started on: {device_name} (Index: {device_index})")
        return stream
    except Exception as e:
        logging.error(f"Failed to open stream on device {device_index}: {e}")
        if device_index is not None:
            logging.warning("Falling back to default device.")
            return start_audio_stream(p_instance, None)
        return None


async def audio_processor(websocket, stream):
    """
    Processes audio data from the stream and sends analysis via WebSocket.
    """
    global last_beat_trigger, beat_history
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
            
            avg_bass_energy = np.mean(beat_history) if beat_history else 0
            beat_history.append(bass_energy)

            is_beat = False
            current_time_ms = loop.time() * 1000
            
            if bass_energy > avg_bass_energy * BEAT_THRESHOLD_MULTIPLIER and current_time_ms - last_beat_trigger > 200:
                is_beat = True
                last_beat_trigger = current_time_ms

            normalized_mids = min(mids_energy / 15000, 1)

            audio_data = {
                "type": "audio_data",
                "payload": {
                    "is_beat": is_beat,
                    "rhythm_factor": normalized_mids
                }
            }
            
            await websocket.send(json.dumps(audio_data))

    except asyncio.CancelledError:
        logging.info("Audio processor task cancelled.")
    except websockets.exceptions.ConnectionClosed:
        logging.info("WebSocket client disconnected during audio processing.")
    except Exception as e:
        logging.error(f"An error occurred in audio_processor: {e}", exc_info=True)

async def handler(websocket):
    """
    Main handler for each WebSocket connection.
    Sends device list and manages audio stream based on client messages.
    """
    logging.info("WebSocket client connected!")
    
    devices = get_input_devices(audio_state["p"])
    await websocket.send(json.dumps({
        "type": "device_list",
        "payload": devices
    }))
    
    default_device = next((d for d in devices if 'stereo mix' in d['name'].lower()), None)
    if default_device:
        audio_state["current_device_index"] = default_device['index']
    elif devices:
        audio_state["current_device_index"] = devices[0]['index']

    audio_state["stream"] = start_audio_stream(audio_state["p"], audio_state["current_device_index"])
    if audio_state["stream"]:
        audio_state["audio_processor_task"] = asyncio.create_task(
            audio_processor(websocket, audio_state["stream"])
        )

    try:
        async for message in websocket:
            data = json.loads(message)
            
            if data.get("type") == "select_device":
                new_device_index = data.get("payload", {}).get("index")
                logging.info(f"Received request to switch to device index: {new_device_index}")

                if audio_state["audio_processor_task"]:
                    audio_state["audio_processor_task"].cancel()
                    await asyncio.sleep(0.1)

                if audio_state["stream"]:
                    audio_state["stream"].stop_stream()
                    audio_state["stream"].close()

                audio_state["current_device_index"] = new_device_index
                audio_state["stream"] = start_audio_stream(audio_state["p"], new_device_index)

                if audio_state["stream"]:
                    audio_state["audio_processor_task"] = asyncio.create_task(
                        audio_processor(websocket, audio_state["stream"])
                    )

    except websockets.exceptions.ConnectionClosed:
        logging.info("WebSocket client disconnected.")
    finally:
        if audio_state["audio_processor_task"]:
            audio_state["audio_processor_task"].cancel()
        if audio_state["stream"]:
            audio_state["stream"].stop_stream()
            audio_state["stream"].close()
            audio_state["stream"] = None


async def main():
    """Main function to initialize PyAudio and the WebSocket server."""
    audio_state["p"] = pyaudio.PyAudio()

    print("Available input devices:")
    devices = get_input_devices(audio_state["p"])
    for device in devices:
        print(f"  Index {device['index']}: {device['name']}")
    print("-" * 20)
    
    try:
        async with websockets.serve(handler, "localhost", 8766):
            logging.info("Server started on ws://localhost:8766")
            await asyncio.Future()
    finally:
        logging.info("Server is shutting down. Cleaning up PyAudio.")
        audio_state["p"].terminate()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Server stopped by user.")

