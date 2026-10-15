// ISBN helpers shared by the search route (normalize user input) and the detail route (parse the
// catalog row). VÖBB writes ISBNs hyphenated, e.g. "978-3-8479-0162-4" or "3-89813-259-5".

function isValidIsbn10(digits: string): boolean {
  if (!/^\d{9}[\dX]$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const value = digits[i] === 'X' ? 10 : Number(digits[i]);
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(digits: string): boolean {
  if (!/^97[89]\d{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

// Returns the bare digits if the input is exactly one valid ISBN-10 or ISBN-13
// ("ISBN 978-3-8479-0162-4", "3 89813 259 5", "389813259x"), otherwise null
export function normalizeIsbn(input: string): string | null {
  const digits = input.trim().replace(/^ISBN(-1[03])?:?/i, '').replace(/[\s-]/g, '').toUpperCase();
  if (isValidIsbn13(digits) || isValidIsbn10(digits)) return digits;
  return null;
}

export function toIsbn13(isbn: string): string {
  if (isbn.length === 13) return isbn;
  const body = `978${isbn.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return `${body}${(10 - (sum % 10)) % 10}`;
}

// First valid ISBN in a catalog row, as written (hyphenated). The row can list parallel editions
// after it: "978-3-423-28972-6 978-3-8445-3110-7 (parallele Ausgabe)".
export function parseIsbn(text: string): string | undefined {
  for (const match of text.matchAll(/[\dXx][\dXx-]{8,16}[\dXx]/g)) {
    if (normalizeIsbn(match[0])) return match[0].toUpperCase();
  }
  return undefined;
}
