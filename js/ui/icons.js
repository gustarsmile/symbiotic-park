// Small SVG icons, drawn as strings. Ported from the prototype's IC table (drawn the same way).
const svg = (body) => '<svg viewBox="0 0 64 64" aria-hidden="true">' + body + '</svg>';

// The icons that the prototype switched with an argument are here as functions; below they get two names each.
const FN = {
  veg: (bad) => svg('<ellipse cx="32" cy="55" rx="17" ry="4" fill="rgba(60,50,30,.18)"/><path d="M32 54c-13 0-21-9-20-22 6 1 10 4 12 9-3-9-1-18 8-25 9 7 11 16 8 25 2-5 6-8 12-9 1 13-7 22-20 22z" fill="' + (bad ? '#8fae58' : '#62b545') + '"/><path d="M32 54c-6-7-7-17 0-34 7 17 6 27 0 34z" fill="' + (bad ? '#b7cc7a' : '#a5e07a') + '"/><path d="M32 54V26" stroke="#f4f7e4" stroke-width="2.4" stroke-linecap="round"/>' + (bad ? '<circle cx="22" cy="38" r="3.2" fill="#6b5a36"/><circle cx="41" cy="33" r="2.6" fill="#6b5a36"/><circle cx="39" cy="45" r="2.2" fill="#6b5a36"/>' : '')),
  tray: (full) => '<svg viewBox="0 0 104 74" aria-hidden="true"><rect x="4" y="16" width="96" height="46" rx="6" fill="#b9bfc4"/><rect x="10" y="22" width="84" height="34" rx="3" fill="#e9ecee"/>' + (full ? '<g stroke="#8fc45a" stroke-width="4" stroke-linecap="round"><path d="M18 30h30M22 39h34M16 48h28M58 30h28M62 40h24M52 49h32"/></g>' : '<path d="M30 39h44" stroke="#c9ced2" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 8"/>') + '</svg>',
  pot: (k) => '<svg viewBox="0 0 104 74" aria-hidden="true">' + (k >= 3 ? '<path d="M38 16c-4-5 4-7 0-12M54 16c-4-5 4-7 0-12M70 16c-4-5 4-7 0-12" fill="none" stroke="#c9ced2" stroke-width="3" stroke-linecap="round"/>' : '') + '<path d="M14 32h76v22c0 9-7 14-16 14H30c-9 0-16-5-16-14z" fill="#555c60"/>' + (k ? '<path d="M19 32h66v' + (5 + k * 2) + 'H19z" fill="#7fc955"/>' : '') + '<rect x="6" y="25" width="92" height="8" rx="4" fill="#3b4246"/><rect x="0" y="30" width="10" height="6" rx="3" fill="#3b4246"/><rect x="94" y="30" width="10" height="6" rx="3" fill="#3b4246"/></svg>',
  bucket: (full) => svg('<path d="M14 22h36l-4 34H18z" fill="#7d868c"/>' + (full ? '<circle cx="25" cy="20" r="5" fill="#9cc46a"/><circle cx="37" cy="19" r="5.5" fill="#c7873a"/><circle cx="31" cy="17" r="4" fill="#8a6a48"/>' : '') + '<rect x="12" y="19" width="40" height="7" rx="3" fill="#5f686e"/>'),
  cell: (sown) => svg('<rect x="8" y="14" width="48" height="42" rx="6" fill="#5f4f34"/><rect x="13" y="19" width="38" height="32" rx="4" fill="#7d5c3a"/>' + (sown ? '<path d="M32 44V30" stroke="#6cbf4b" stroke-width="3" stroke-linecap="round"/><path d="M32 32c-7 0-10-4-10-9 6 0 10 3 10 9z" fill="#7fc955"/><path d="M32 30c6 0 9-4 9-8-5 0-9 3-9 8z" fill="#a5e07a"/>' : '<circle cx="32" cy="36" r="4" fill="#5a4026"/>')),
};

const IC = {
  veg: () => FN.veg(false),
  vegBad: () => FN.veg(true),
  grass: svg('<ellipse cx="32" cy="56" rx="16" ry="4" fill="rgba(60,50,30,.18)"/><g fill="none" stroke-linecap="round" stroke-width="3.4"><path d="M32 56C30 40 22 26 10 16" stroke="#8fc45a"/><path d="M32 56c-1-18-4-30-8-44" stroke="#a9d86c"/><path d="M32 56c0-18 1-32 2-48" stroke="#8fc45a"/><path d="M32 56c1-18 5-30 12-42" stroke="#a9d86c"/><path d="M32 56c2-16 10-28 22-36" stroke="#8fc45a"/></g><path d="M25 57h14l-2-8H27z" fill="#d9c58a"/>'),
  bundle: svg('<g stroke-linecap="round" stroke-width="4.4" fill="none"><path d="M22 55 26 10" stroke="#8fc45a"/><path d="M29 56 31 8" stroke="#a9d86c"/><path d="M36 56 37 9" stroke="#8fc45a"/><path d="M43 55 42 12" stroke="#a9d86c"/></g><rect x="18" y="36" width="29" height="6" rx="3" fill="#c7873a"/>'),
  box: svg('<path d="M16 24c2-8 8-12 16-10 4-6 12-5 15 2 6 0 8 4 7 8z" fill="#62b545"/><rect x="8" y="24" width="48" height="30" rx="3" fill="#c99a5b"/><rect x="8" y="24" width="48" height="7" fill="#b4854a"/><rect x="20" y="36" width="24" height="12" rx="2" fill="#fbf6e9"/><path d="M25 42h14" stroke="#2f6b3a" stroke-width="2.4" stroke-linecap="round"/>'),
  crate: svg('<path d="M14 26c4-7 10-9 16-6 6-5 14-3 18 6z" fill="#8fae58"/><path d="M8 26h48l-5 28H13z" fill="#a8743c"/><path d="M11 35h42M13 44h38" stroke="#8a5c2c" stroke-width="2.4"/>'),
  tray: () => FN.tray(false),
  trayFull: () => FN.tray(true),
  tea: svg('<path d="M32 8v12" stroke="#b9a36a" stroke-width="2"/><rect x="26" y="3" width="12" height="8" rx="2" fill="#f0b429"/><path d="M18 20h28l4 34H14z" fill="#f4ecd6"/><path d="M18 20h28l1 8H17z" fill="#e3d6b0"/><path d="M24 38c4-6 12-6 16 0-4 6-12 6-16 0z" fill="#8fc45a"/>'),
  pot: (k) => FN.pot(k),
  bucket: () => FN.bucket(true),
  bucketEmpty: () => FN.bucket(false),
  bowl: svg('<path d="M14 30c2-8 10-13 18-13s16 5 18 13z" fill="#62b545"/><circle cx="26" cy="24" r="4" fill="#e9a13a"/><path d="M8 30h48c0 14-10 23-24 23S8 44 8 30z" fill="#fbf6e9" stroke="#d6caa6" stroke-width="2"/>'),
  cell: () => FN.cell(false),
  cellSown: () => FN.cell(true),
  tagged: svg('<path d="M14 26c4-7 10-9 16-6 6-5 14-3 18 6z" fill="#8fae58"/><path d="M8 26h48l-5 28H13z" fill="#a8743c"/><path d="M11 35h42M13 44h38" stroke="#8a5c2c" stroke-width="2.4"/><rect x="31" y="32" width="24" height="17" rx="2.5" fill="#fbf6e9" stroke="#2f6b3a" stroke-width="1.8"/><path d="M35 38h16M35 43h10" stroke="#2f6b3a" stroke-width="2.2" stroke-linecap="round"/>'),
  priced: svg('<path d="M16 24c2-8 8-12 16-10 4-6 12-5 15 2 6 0 8 4 7 8z" fill="#62b545"/><rect x="8" y="24" width="48" height="30" rx="3" fill="#c99a5b"/><rect x="8" y="24" width="48" height="7" fill="#b4854a"/><rect x="12" y="34" width="40" height="15" rx="2" fill="#fbf6e9"/><rect x="15" y="38" width="17" height="7" fill="#2f6b3a"/><rect x="32" y="38" width="7" height="7" fill="#8a6a48"/><rect x="39" y="38" width="7.5" height="7" fill="#3d7fa6"/><rect x="46.5" y="38" width="2.8" height="7" fill="#f0b429"/>'),
  herbbox: svg('<path d="M16 24c2-8 8-12 16-10 4-6 12-5 15 2 6 0 8 4 7 8z" fill="#62b545"/><path d="M46 28C49 19 47 11 42 5" fill="none" stroke="#2f6b3a" stroke-width="3" stroke-linecap="round"/><path d="M45 14c-6-1-9 2-10 6 5 1 9-1 10-6z" fill="#7fc955"/><path d="M47 20c5-3 9-1 10 3-4 2-8 1-10-3z" fill="#a5e07a"/><rect x="8" y="24" width="48" height="30" rx="3" fill="#c99a5b"/><rect x="8" y="24" width="48" height="7" fill="#b4854a"/><g transform="rotate(-8 24 40)"><rect x="14" y="31" width="20" height="18" rx="2" fill="#fffdf4" stroke="#c9b98a" stroke-width="1.4"/><path d="M18 37h12M18 41h12M18 45h7" stroke="#b4552f" stroke-width="1.8" stroke-linecap="round"/></g>'),
  emptybox: svg('<path d="M8 26l6-8h36l6 8z" fill="#dab57d"/><rect x="8" y="26" width="48" height="28" rx="3" fill="#c99a5b"/><rect x="8" y="26" width="48" height="6" fill="#b4854a"/><path d="M12 22h40" stroke="#8a5c2c" stroke-width="1.6" opacity=".5"/>'),
  coin: svg('<ellipse cx="32" cy="56" rx="15" ry="3.5" fill="rgba(60,50,30,.18)"/><circle cx="32" cy="31" r="22" fill="#f0b429"/><circle cx="32" cy="31" r="16" fill="none" stroke="#c98a1a" stroke-width="2.6"/><path d="M32 21v20M24 27h16M24 34h16" stroke="#c98a1a" stroke-width="3" stroke-linecap="round"/>'),
  // Not in the prototype (added with the farmer's first morning): a phone with a leaf on its screen, and a soil sensor with a drop of water.
  phone: svg('<ellipse cx="32" cy="56" rx="16" ry="4" fill="rgba(60,50,30,.18)"/><rect x="18" y="5" width="28" height="49" rx="5" fill="#3b4246"/><rect x="21" y="11" width="22" height="36" rx="2" fill="#e3f0f5"/><circle cx="32" cy="8" r="1.3" fill="#7d868c"/><rect x="28" y="49.5" width="8" height="2" rx="1" fill="#7d868c"/><path d="M24 39c0-10 6-16 15-17 0 10-6 17-15 17z" fill="#62b545"/><path d="M24.5 38.5 35 26" stroke="#a5e07a" stroke-width="1.8" stroke-linecap="round"/>'),
  sensor: svg('<ellipse cx="32" cy="56" rx="16" ry="4" fill="rgba(60,50,30,.18)"/><ellipse cx="32" cy="50" rx="20" ry="5.5" fill="#8a6a48"/><ellipse cx="32" cy="48.6" rx="16" ry="3.6" fill="#a47c52"/><path d="M28 35v14M36 35v14" stroke="#9aa3a8" stroke-width="2.6" stroke-linecap="round"/><rect x="21" y="22" width="22" height="14" rx="3" fill="#3d7fa6"/><rect x="25" y="25.5" width="14" height="7" rx="1.5" fill="#e3f0f5"/><path d="M28 29h8" stroke="#62b545" stroke-width="2.2" stroke-linecap="round"/><path d="M32 3c4 5.5 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-5.5 6-11z" fill="#5fb3e0"/><path d="M29.4 14.6a3 3 0 0 0 2.2 2.6" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>'),
};

export const ICON_NAMES = Object.keys(IC);

// The SVG string for an icon. `arg` is the number of layers (0 to 5) for the pot. An unknown name is an error.
export function icon(name, arg) {
  if (!Object.prototype.hasOwnProperty.call(IC, name)) throw new Error('unknown icon: ' + name);
  const v = IC[name];
  return typeof v === 'function' ? v(arg) : v;
}
