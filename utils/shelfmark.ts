// utils/shelfmark.ts
// The availability table has no "Signatur" column: it is Bibliothek | Standort | Bestellmöglichkeit |
// Verfügbarkeit, and the signature is the last " - " segment of Standort
// ("Freihand Erwachsene / Historisches - Roman Garm", "Magazin 1 - Bereitstellung 1-3 Tage - Roman Garm").
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { AvailabilityInfo } from '../types/types';

/** Returns the signature from a Standort cell, or undefined when the cell has no " - " separator. */
export function parseShelfmark(standort: string | undefined): string | undefined {
  if (!standort) return undefined;
  const parts = standort.split(/\s+-\s+/);
  if (parts.length < 2) return undefined;
  return parts[parts.length - 1].trim() || undefined;
}

/** Reads the per-branch rows of the detail page's availability table. */
export function parseAvailabilityTable($: CheerioAPI, table: Cheerio<AnyNode>): AvailabilityInfo[] {
  const availability: AvailabilityInfo[] = [];
  if (table.length === 0) return availability;

  // Columns are located by header so a layout change cannot make us show "Bestellmöglichkeit" as signature
  const headers = table.find('thead th').map((_, th) => $(th).text().trim().toLowerCase()).get();
  const signatureCol = headers.indexOf('signatur');
  const locationCol = headers.indexOf('standort') >= 0 ? headers.indexOf('standort') : 1;

  table.find('tbody tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length < 4) return;
    const cellText = (i: number) => cells.eq(i).text().trim().replace(/\s+/g, ' ');
    const branchText = cellText(0);
    const shelfmark = signatureCol >= 0 ? cellText(signatureCol) : parseShelfmark(cellText(locationCol));
    const statusText = cells.last().text().trim().replace(/\s+/g, ' ');
    if (branchText.toLowerCase().includes('kopierlink') || branchText.toLowerCase().includes('[buch]')) return;
    if (branchText && statusText) {
      availability.push({ libraryName: branchText, status: statusText, shelfmark: shelfmark || undefined });
    }
  });
  return availability;
}
