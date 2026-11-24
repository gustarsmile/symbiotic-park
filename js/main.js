import { boot } from './boot.js';

// This line runs only if every module has loaded, linked and run. The page's own few lines (day/index.html) look for
// the mark on the load event: without it they show the retry panel in place of the loading line.
document.documentElement.setAttribute('data-park', 'started');
boot().catch(() => { /* the page already shows the retry panel */ });
