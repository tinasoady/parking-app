import { Buffer } from 'buffer';
import { toPrinterSafeText } from './textUtils';

const ESC = 0x1b;
const GS = 0x1d;

/**
 * Minimal ESC/POS command builder. Accumulates raw bytes and produces a single Buffer that
 * can be written directly to a Bluetooth Classic SPP connection (react-native-bluetooth-classic
 * accepts Buffers as-is, no base64/string encoding needed on our side).
 */
export class EscPosBuilder {
  private chunks: number[] = [];

  init(): this {
    this.chunks.push(ESC, 0x40); // ESC @  – initialize printer
    return this;
  }

  align(mode: 'left' | 'center' | 'right'): this {
    const n = mode === 'left' ? 0 : mode === 'center' ? 1 : 2;
    this.chunks.push(ESC, 0x61, n);
    return this;
  }

  bold(on: boolean): this {
    this.chunks.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  doubleSize(on: boolean): this {
    this.chunks.push(GS, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  text(line: string): this {
    const safe = toPrinterSafeText(line);
    for (let i = 0; i < safe.length; i += 1) {
      this.chunks.push(safe.charCodeAt(i) & 0xff);
    }
    return this;
  }

  /** Text followed by a line feed. */
  line(line = ''): this {
    this.text(line);
    this.chunks.push(0x0a);
    return this;
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i += 1) {
      this.chunks.push(0x0a);
    }
    return this;
  }

  cut(): this {
    this.chunks.push(GS, 0x56, 0x00);
    return this;
  }

  build(): Buffer {
    return Buffer.from(this.chunks);
  }
}
