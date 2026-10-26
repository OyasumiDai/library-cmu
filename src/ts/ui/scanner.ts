// Reading the library's QR codes with the device camera.
// Chrome and Edge have a built-in reader (BarcodeDetector); every other browser uses jsQR.
import jsQR from "jsqr";

// the QR code holds https://site/pickup?c=CODE (a phone camera opens that page); the desk can also type the bare code
export function extractCode(text: string): string | null {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("c");
    if (code && /^[A-Za-z0-9]{8,16}$/.test(code)) return code.toUpperCase();
  } catch {
    /* not a link: maybe the bare code */
  }
  return /^[A-Fa-f0-9]{8,12}$/.test(trimmed.replace(/[\s-]/g, "")) ? trimmed.replace(/[\s-]/g, "").toUpperCase() : null;
}

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

export interface Scanner {
  stop(): void;
}

export async function startScanner(video: HTMLVideoElement, onText: (text: string) => void): Promise<Scanner> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot use the camera. Type the code instead.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();

  const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => DetectorLike }).BarcodeDetector;
  const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  let busy = false;

  const tick = async () => {
    if (busy || video.readyState < 2 || !video.videoWidth) return;
    busy = true;
    try {
      if (detector) {
        const found = await detector.detect(video);
        if (found[0]) onText(found[0].rawValue);
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
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
