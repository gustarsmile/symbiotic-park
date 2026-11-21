import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_FILES, assemble } from '../../js/data.js';

// Reads the same files the site loads, straight from disk.
export const readDataFile = (file) => JSON.parse(readFileSync(resolve(process.cwd(), 'js/data', file), 'utf8'));

export function readData() {
  return assemble(Object.fromEntries(DATA_FILES.map((f) => [f, readDataFile(f)])));
}
