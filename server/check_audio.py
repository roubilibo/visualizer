import pyaudio

print("Mencoba menginisialisasi PyAudio...")

try:
    p = pyaudio.PyAudio()
    print("PyAudio berhasil diinisialisasi.")

    device_count = p.get_device_count()
    print(f"Menemukan {device_count} perangkat audio.")

    print("-" * 30)
    # Loop untuk melihat semua perangkat audio yang tersedia
    for i in range(device_count):
        info = p.get_device_info_by_index(i)
        print(f"Device {i}: {info['name']} | Input Channels: {info['maxInputChannels']}")
    print("-" * 30)

    # Coba cari default input device
    try:
        default_info = p.get_default_input_device_info()
        print(f"Default input device: {default_info['name']} (Index: {default_info['index']})")
    except IOError:
        print("ERROR: Tidak ada default input device yang ditemukan!")

except Exception as e:
    print("\n!!! TERJADI ERROR PADA PYAUDIO !!!")
    print(f"Error: {e}")

finally:
    if 'p' in locals() and p:
        p.terminate()
        print("PyAudio dihentikan.")