// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

// main.js runs only once every module it imports has loaded, linked and run. Its first act is to leave a mark that the
// page's own few lines look for on the load event. boot() is replaced here, so nothing is loaded for real.
const seen = vi.hoisted(() => ({ calls: 0, markAtBoot: null }));
vi.mock('../js/boot.js', () => ({
  boot: () => {
    seen.calls++; seen.markAtBoot = document.documentElement.getAttribute('data-park');
    return Promise.reject(new Error('the data did not come'));             // boot's own failure: main.js must swallow it
  },
}));

describe('main.js', () => {
  it('先留下記號、再叫 boot()；boot 失敗時（它自己會出再試一次）不丟出錯誤', async () => {
    document.documentElement.removeAttribute('data-park');
    const errors = [];
    const onError = (e) => errors.push(e);
    process.on('unhandledRejection', onError);
    try {
      await import('../js/main.js');
      await new Promise((r) => setTimeout(r, 0));
      expect(seen.calls).toBe(1);
      expect(seen.markAtBoot).toBe('started');
      expect(document.documentElement.getAttribute('data-park')).toBe('started');
      expect(errors).toEqual([]);
    } finally { process.off('unhandledRejection', onError); }
  });
});
