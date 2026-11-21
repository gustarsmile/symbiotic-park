// happy-dom has no Canvas. This swaps getContext for a stand-in that swallows every call and keeps a log in `calls`:
// [name, ...args] for a call, ['=name', value] for a property that was set.
export function installFakeCanvas() {
  const proto = globalThis.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  proto.getContext = function getContext() {
    if (!this.__fake) this.__fake = makeContext(this);
    return this.__fake;
  };
  return () => { proto.getContext = original; };
}

function makeContext(canvas) {
  const calls = [], store = { canvas, calls }, fns = {};
  return new Proxy(store, {
    get(t, name) {
      if (name in t) return t[name];
      if (typeof name !== 'string') return undefined;
      return (fns[name] ??= (...args) => {
        calls.push([name, ...args]);
        if (name === 'measureText') return { width: 0 };
        if (/^create(Linear|Radial|Conic)Gradient$/.test(name)) return { addColorStop() {} };
        return undefined;
      });
    },
    set(t, name, value) { t[name] = value; calls.push(['=' + name, value]); return true; },
  });
}
