// Small helpers shared by the scene state machines.

// An accepted press.
export const accepted = () => ({ ok: true, tip: null });

// A press on an id that does not exist or cannot be pressed now: nothing changes.
export const rejected = () => ({ ok: false, tip: null });

// A wrong answer: the caller records the tip so view().tip shows it.
export const wrong = (tip) => ({ ok: false, tip });

// Text of a Sourced value ({ text, source }); a plain string is accepted too.
export const textOf = (x) => (typeof x === 'string' ? x : x.text);

// The number inside an id such as "i3" (the prefix is one letter).
export const indexOf = (id) => Number(id.slice(1));
