import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(process.cwd(), 'day/index.html'), 'utf8');       // happy-dom: import.meta.url is not a file address, so go from the project folder
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1].replace(/<script[\s\S]*?<\/script>/g, '');

// Puts the body of the park page into the current document (scripts left out).
export function mountPage() {
  document.body.innerHTML = body;
}
