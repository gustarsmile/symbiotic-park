import { readFileSync } from 'node:fs';
import { DATA_FILES, assemble } from '../../js/data.js';

// Reads the same files the site loads, straight from disk.
export const readDataFile = (file) => JSON.parse(readFileSync(new URL(`../../js/data/${file}`, import.meta.url), 'utf8'));

export function readData() {
  return assemble(Object.fromEntries(DATA_FILES.map((f) => [f, readDataFile(f)])));
}
