import librosa
import numpy as np
import matplotlib.pyplot as plt

import os
def spectrograms_creation(audio_path, N_FFT, HOP_LENGTH, COLORMAP, sr_target,winlength):
    audio, sr = librosa.load(audio_path, sr = sr_target)
     

    # sélection de colormap
    if COLORMAP == 0:
      colormap = "gray"
    elif COLORMAP == 1:
        colormap = "viridis"
    else:
        raise ValueError("colormap invalide")

    spectrogram = librosa.stft(audio, n_fft= N_FFT, hop_length= HOP_LENGTH,win_length= winlength, center = False)
    spectrogram_db = librosa.amplitude_to_db(np.abs(spectrogram))
    print(f"la taille de spectrogram = {spectrogram_db.shape}")
    print("Spectrogramme crée avec succée !" )
    return spectrogram_db, colormap


def save_spectrogram_npy(spectrogram_db, colormap, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    np.save(output_path, spectrogram_db)


def save_spectrogram_png(spectrogram_db, colormap, output_path):   # sauvegarder un png de même taille que le spectrogramme
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.figure(figsize=(spectrogram_db.shape[1] / 100, spectrogram_db.shape[0] / 100), dpi=100)
    plt.axis('off')
    plt.imshow(spectrogram_db, aspect='auto', cmap=colormap, origin='lower')
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0)
    plt.close()



def BD_creation(base_audio_path, N_FFT, HOP_LENGTH, COLORMAP, sr_target, winlength):
    classe = ["Control", "Patologicas"]
    
    npy_dir = os.path.join(base_audio_path, "spectnumpy_8K")
    png_dir = os.path.join(base_audio_path, "spectpng_8K")
    os.makedirs(npy_dir, exist_ok=True)
    os.makedirs(png_dir, exist_ok=True)

    for c in classe:
        audio_path = os.path.join(base_audio_path, c)
        if not os.path.isdir(audio_path):
            continue
        for audio_file in os.listdir(audio_path):
            if audio_file.endswith(".wav"):
                audio_file_path = os.path.join(audio_path, audio_file)
                spectrogram_db, colormap = spectrograms_creation(audio_file_path, N_FFT, HOP_LENGTH, COLORMAP, sr_target, winlength)
                audio_file_name = os.path.splitext(audio_file)[0]
                save_spectrogram_npy(spectrogram_db, colormap, os.path.join(npy_dir, c, f"{audio_file_name}.npy"))
                save_spectrogram_png(spectrogram_db, colormap, os.path.join(png_dir, c, f"{audio_file_name}.png"))
    print("Base de données de spectrogrammes créée avec succès !")
        


if __name__ == "__main__":
    #audio_path = r"C:\Users\MSI\Desktop\Parkinson_VF\DATA\Original\Control\AVPEPUDEAC0001i2.wav"
    N_FFT = 512
    HOP_LENGTH = 128
    COLORMAP = 0
    sr_target = 8000
    winlength = 512

    #spectrogram_db, colormap = spectrograms_creation(audio_path, N_FFT, HOP_LENGTH, COLORMAP, sr_target,winlength)
    #output_npy_path = r"C:\Users\MSI\Desktop\Parkinson_VF\spectrograms_creation.npy"
    #output_png_path =r"C:\Users\MSI\Desktop\Parkinson_VF\spectrograms_creation.png"

    #save_spectrogram_npy(spectrogram_db, colormap, output_npy_path)
    #save_spectrogram_png(spectrogram_db, colormap, output_png_path)
    BD = r"C:\Users\MSI\Desktop\pd_project\pd_project\DATA\Segmented_1"
    BD_creation(BD, N_FFT, HOP_LENGTH, COLORMAP, sr_target, winlength)