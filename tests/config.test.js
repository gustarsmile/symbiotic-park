import { describe, it, expect } from 'vitest';
import { SITE_TITLE, SITE_URL, PARK_PATH, STORAGE_KEY, SITE_TAGLINE } from '../js/config.js';

describe('config', () => {
  it('定址與紀錄的名稱', () => {
    expect(SITE_TITLE).toBe('互助共生園區');
    expect(SITE_URL).toMatch(/^https:\/\/edu\.omilkyway\.org\/[a-z-]+\/$/);
    expect(PARK_PATH).toBe('day/');
    expect(STORAGE_KEY).toBe('parkDay.v1');
    expect(SITE_TAGLINE).toBe('規劃中的示意');
  });
});
