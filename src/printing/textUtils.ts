/**
 * Most cheap Bluetooth ESC/POS thermal printers use the CP437/PC850 codepage and mangle
 * accented Latin characters. Stripping diacritics keeps receipts readable on any printer
 * without requiring per-model codepage configuration.
 */
export function toPrinterSafeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x00-\x7E]/g, '?');
}

/** Pads/truncates a line to exactly `width` characters. */
function fit(text: string, width: number): string {
  if (text.length >= width) {
    return text.slice(0, width);
  }
  return text + ' '.repeat(width - text.length);
}

/** Left label / right value on one line, e.g. "Ticket n°     0007" */
export function twoColumns(left: string, right: string, width: number): string {
  const safeLeft = toPrinterSafeText(left);
  const safeRight = toPrinterSafeText(right);
  const space = Math.max(1, width - safeLeft.length - safeRight.length);
  return `${safeLeft}${' '.repeat(space)}${safeRight}`;
}

export function centered(text: string, width: number): string {
  const safe = toPrinterSafeText(text);
  if (safe.length >= width) return safe.slice(0, width);
  const padTotal = width - safe.length;
  const padLeft = Math.floor(padTotal / 2);
  return ' '.repeat(padLeft) + safe;
}

export function separator(width: number, char = '-'): string {
  return char.repeat(width);
}

export { fit };
