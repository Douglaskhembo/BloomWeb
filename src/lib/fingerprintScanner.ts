/**
 * Real-time fingerprint capture directly from the browser via the Web Serial API — no bridge
 * app, no vendor SDK. Talks the UART protocol used by the commodity R307/R305/AS608/FPM10A
 * optical fingerprint module family (57600 baud, 8N1). Only Chromium-based browsers (Chrome/Edge,
 * desktop + Android) implement Web Serial — Firefox/Safari cannot use this path.
 *
 * Protocol reference: Hangzhou Grow R307S user manual + ADH-Tech fingerprint module manual.
 * Packet: 0xEF01 header, 4-byte address (default 0xFFFFFFFF), 1-byte package ID, 2-byte
 * big-endian length (covers content + 2-byte checksum), content, 2-byte big-endian checksum
 * (sum of PID + length + content, truncated to 16 bits).
 */

const HEADER = [0xef, 0x01];
const ADDRESS = [0xff, 0xff, 0xff, 0xff];

const PID = { COMMAND: 0x01, DATA: 0x02, ACK: 0x07, END: 0x08 } as const;
const CMD = { GEN_IMG: 0x01, UP_IMAGE: 0x0a } as const;
const CONFIRM = { OK: 0x00, NO_FINGER: 0x02 } as const;

// Raw sensor image is 256x288 pixels, 4 bits/pixel (two pixels packed per byte).
const IMAGE_WIDTH = 256;
const IMAGE_HEIGHT = 288;

// Minimal ambient typings for the small slice of the Web Serial API used here — avoids
// pulling in a whole @types/w3c-web-serial dependency for a handful of calls.
interface WebSerialPort {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}
declare global {
  interface Navigator {
    serial?: { requestPort(): Promise<WebSerialPort> };
  }
}

function buildPacket(pid: number, content: number[]): Uint8Array {
  const length = content.length + 2; // +2 for the checksum itself
  const lenHi = (length >> 8) & 0xff;
  const lenLo = length & 0xff;
  let sum = pid + lenHi + lenLo;
  for (const b of content) sum += b;
  sum &= 0xffff;
  return new Uint8Array([...HEADER, ...ADDRESS, pid, lenHi, lenLo, ...content, (sum >> 8) & 0xff, sum & 0xff]);
}

/** Accumulates bytes from the serial reader so packets can be parsed regardless of how the
 *  underlying stream happens to chunk them (Web Serial gives no guarantee reads align to packets). */
class ByteStream {
  private buffer: number[] = [];
  constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) {}

  async readBytes(n: number): Promise<number[]> {
    while (this.buffer.length < n) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error("Serial port closed while reading");
      this.buffer.push(...value);
    }
    const out = this.buffer.slice(0, n);
    this.buffer = this.buffer.slice(n);
    return out;
  }
}

async function readPacket(stream: ByteStream): Promise<{ pid: number; payload: Uint8Array }> {
  // Re-sync to the 0xEF 0x01 header rather than assuming perfect alignment.
  let prev = -1;
  while (true) {
    const [b] = await stream.readBytes(1);
    if (prev === 0xef && b === 0x01) break;
    prev = b;
  }
  await stream.readBytes(4); // address — not validated, module always echoes the default
  const [pid] = await stream.readBytes(1);
  const [lenHi, lenLo] = await stream.readBytes(2);
  const length = (lenHi << 8) | lenLo;
  const body = await stream.readBytes(length); // content + 2-byte checksum
  const payload = new Uint8Array(body.slice(0, -2));
  const givenChecksum = (body[body.length - 2] << 8) | body[body.length - 1];

  let sum = pid + lenHi + lenLo;
  for (const b of payload) sum += b;
  sum &= 0xffff;
  if (sum !== givenChecksum) throw new Error("Fingerprint sensor packet failed checksum");

  return { pid, payload };
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Two 4-bit grayscale pixels per byte (high nibble first) → one 8-bit grayscale byte each. */
function unpack4BitGrayscale(packed: Uint8Array): Uint8Array {
  const out = new Uint8Array(packed.length * 2);
  for (let i = 0; i < packed.length; i++) {
    const hi = (packed[i] >> 4) & 0x0f;
    const lo = packed[i] & 0x0f;
    out[i * 2] = (hi << 4) | hi; // replicate nibble so 0x0-0xF spans the full 0-255 range
    out[i * 2 + 1] = (lo << 4) | lo;
  }
  return out;
}

function grayscaleToPng(pixels: Uint8Array, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < pixels.length; i++) {
    const gray = pixels[i];
    imageData.data[i * 4] = gray;
    imageData.data[i * 4 + 1] = gray;
    imageData.data[i * 4 + 2] = gray;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode captured image"))), "image/png");
  });
}

export function isFingerprintScannerSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.serial;
}

class FingerprintScanner {
  private port: WebSerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private stream: ByteStream | null = null;

  get connected(): boolean {
    return !!this.port;
  }

  /** Prompts the browser's device picker — must be called from a user gesture (e.g. a click). */
  async connect(): Promise<void> {
    if (!isFingerprintScannerSupported()) {
      throw new Error("This browser doesn't support Web Serial. Use Chrome or Edge on desktop or Android.");
    }
    this.port = await navigator.serial!.requestPort();
    await this.port.open({ baudRate: 57600, dataBits: 8, stopBits: 1, parity: "none" });
    this.reader = this.port.readable!.getReader();
    this.writer = this.port.writable!.getWriter();
    this.stream = new ByteStream(this.reader);
    await new Promise((r) => setTimeout(r, 250)); // module needs ~200ms after power-on
  }

  async disconnect(): Promise<void> {
    try { this.reader?.releaseLock(); } catch { /* already released */ }
    try { this.writer?.releaseLock(); } catch { /* already released */ }
    try { await this.port?.close(); } catch { /* already closed */ }
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.stream = null;
  }

  private async sendCommand(instruction: number, params: number[] = []): Promise<void> {
    await this.writer!.write(buildPacket(PID.COMMAND, [instruction, ...params]));
  }

  private async readAck(): Promise<number> {
    const { pid, payload } = await readPacket(this.stream!);
    if (pid !== PID.ACK) throw new Error(`Expected an ack packet from the sensor, got 0x${pid.toString(16)}`);
    return payload[0];
  }

  private async waitForFinger(timeoutMs = 15000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await this.sendCommand(CMD.GEN_IMG);
      const code = await this.readAck();
      if (code === CONFIRM.OK) return;
      if (code !== CONFIRM.NO_FINGER) throw new Error(`Sensor reported an error (code 0x${code.toString(16)})`);
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error("Timed out waiting for a finger on the sensor");
  }

  private async uploadImage(): Promise<Uint8Array> {
    await this.sendCommand(CMD.UP_IMAGE);
    const code = await this.readAck();
    if (code !== CONFIRM.OK) throw new Error(`Sensor refused to upload the image (code 0x${code.toString(16)})`);

    const chunks: Uint8Array[] = [];
    for (;;) {
      const { pid, payload } = await readPacket(this.stream!);
      if (pid !== PID.DATA && pid !== PID.END) throw new Error(`Unexpected packet type 0x${pid.toString(16)} during image transfer`);
      chunks.push(payload);
      if (pid === PID.END) break;
    }
    return unpack4BitGrayscale(concatBytes(chunks));
  }

  /** Waits for a finger, captures it, and returns a ready-to-upload PNG. */
  async captureImage(): Promise<Blob> {
    if (!this.connected) throw new Error("Scanner not connected");
    await this.waitForFinger();
    const pixels = await this.uploadImage();
    return grayscaleToPng(pixels, IMAGE_WIDTH, IMAGE_HEIGHT);
  }
}

/** One scanner is a shared physical resource for the whole page/session. */
export const fingerprintScanner = new FingerprintScanner();
