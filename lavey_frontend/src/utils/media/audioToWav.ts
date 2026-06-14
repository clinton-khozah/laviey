function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function encodeWavFromSamples(samples: Float32Array, sampleRate: number): Blob {
  const bitsPerSample = 16;
  const numChannels = 1;
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true);
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels } = audioBuffer;
  const mono = new Float32Array(length);

  if (numberOfChannels === 1) {
    mono.set(audioBuffer.getChannelData(0));
    return mono;
  }

  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      mono[i] += data[i] / numberOfChannels;
    }
  }

  return mono;
}

/** Whisper works best with 16 kHz mono WAV — convert browser recording blobs before upload. */
export async function convertBlobToWav(blob: Blob, targetSampleRate = 16_000): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  if (arrayBuffer.byteLength < 32) {
    throw new Error('Audio clip was too short to transcribe.');
  }

  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(decoded);

    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(mono.length * (targetSampleRate / decoded.sampleRate))),
      targetSampleRate,
    );

    const monoBuffer = offline.createBuffer(1, mono.length, decoded.sampleRate);
    monoBuffer.getChannelData(0).set(mono);

    const source = offline.createBufferSource();
    source.buffer = monoBuffer;
    source.connect(offline.destination);
    source.start(0);

    const rendered = await offline.startRendering();
    return encodeWavFromSamples(rendered.getChannelData(0), targetSampleRate);
  } finally {
    await audioContext.close();
  }
}
