// Reading the library's QR codes with the device camera.
// Chrome and Edge have a built-in reader (BarcodeDetector); every other browser uses jsQR.
import jsQR from "jsqr";

// the QR code holds https://site/pickup?c=CODE (a phone camera opens that page); the desk can also type the bare code
export function extractCode(text: string): string | null {
  const trimmed = text.trim();
  // any link with ?c=CODE counts, whatever the address looks like (with or without https://, another domain, extra parameters)
  const fromLink = trimmed.match(/[?&]c=([A-Za-z0-9]{8,16})(?:[&#\s]|$)/);
  if (fromLink) return fromLink[1].toUpperCase();
  const bare = trimmed.replace(/[\s-]/g, "");
  return /^[A-Za-z0-9]{8,16}$/.test(bare) && /\d/.test(bare) ? bare.toUpperCase() : null;
}

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

export interface Scanner {
  stop(): void;
}

export async function startScanner(video: HTMLVideoElement, onText: (text: string) => void): Promise<Scanner> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot use the camera. Type the code instead.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();

  const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => DetectorLike }).BarcodeDetector;
  const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  let busy = false;
  let frame = 0;

  const tick = async () => {
    if (busy || video.readyState < 2 || !video.videoWidth) return;
    busy = true;
    try {
      // every other frame looks at the middle of the picture, enlarged: a small QR (a phone held back, or a
      // code shown small in an email) then has big enough squares to read. Both light-on-dark (an email app
      // in dark mode) and dark-on-light codes are tried.
      const zoom = frame++ % 2 === 1;
      const w = video.videoWidth, h = video.videoHeight;
      const side = Math.round(Math.min(w, h) * 0.6);
      if (zoom) {
        canvas.width = canvas.height = Math.min(side * 2, 1400);
        context.imageSmoothingEnabled = false;
        context.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      } else {
        canvas.width = w;
        canvas.height = h;
        context.drawImage(video, 0, 0);
      }
      if (detector) {
        const found = await detector.detect(canvas);
        if (found[0]) onText(found[0].rawValue);
      } else {
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
        if (code) onText(code.data);
      }
    } catch {
      /* a frame that cannot be read is skipped */
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 220);
  return {
    stop() {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

// a short confirmation beep, so the desk knows a scan worked without looking at the screen
export function beep(ok = true): void {
  try {
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.08;
    tone.connect(gain).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + (ok ? 0.12 : 0.3));
  } catch {
    /* sound is optional */
  }
}
