export function cameraAccessUserMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return 'Camera needs a secure page (https). Open the app from its https link, not http.';
  }

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera access was blocked. Allow camera for this site in your browser settings, then try again.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device. Try on a phone or connect a webcam.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Your camera is in use by another app. Close it and try again.';
    }
    if (error.name === 'OverconstrainedError') {
      return 'This camera could not start with the requested settings. Try again or use another device.';
    }
    if (error.name === 'NotSupportedError') {
      return 'Camera is not supported in this browser.';
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('requested device not found') || msg.includes('device not found')) {
      return 'No camera was found on this device. Try on a phone or connect a webcam.';
    }
    if (error.message.trim()) return error.message;
  }

  return 'Could not start the camera. Try again or use another device.';
}

async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    let videoInputs = devices.filter((device) => device.kind === 'videoinput');

    const needsPermission = videoInputs.length === 0 || videoInputs.every((device) => !device.deviceId);
    if (needsPermission) {
      try {
        const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        temp.getTracks().forEach((track) => track.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        videoInputs = devices.filter((device) => device.kind === 'videoinput');
      } catch {
        return videoInputs;
      }
    }

    return videoInputs;
  } catch {
    return [];
  }
}

/** Try progressively looser constraints — strict facingMode often fails on desktops. */
export async function acquireFrontCameraStream(): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new DOMException('Camera requires a secure context', 'NotSupportedError');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera is not supported', 'NotSupportedError');
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 720 },
        height: { ideal: 960 },
      },
      audio: false,
    },
    {
      video: { facingMode: { ideal: 'user' } },
      audio: false,
    },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw err;
      }
    }
  }

  const videoInputs = await listVideoInputs();
  for (const device of videoInputs) {
    if (!device.deviceId) continue;
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } },
        audio: false,
      });
    } catch (err) {
      lastError = err;
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw err;
      }
    }
  }

  throw lastError ?? new DOMException('No camera available', 'NotFoundError');
}
