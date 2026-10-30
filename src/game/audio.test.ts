import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('unlock', () => {
  it.each(['suspended', 'interrupted'])('resumes a context left %s', async (state) => {
    const resume = vi.fn(() => Promise.resolve());
    vi.stubGlobal('AudioContext', class {
      state = state;
      sampleRate = 8000;
      destination = {};
      resume = resume;
      createGain() { return { gain: { value: 1 }, connect() {} }; }
      createBuffer() { return { getChannelData: () => new Float32Array(4) }; }
    });
    const { unlock } = await import('./audio.ts');
    unlock();
    expect(resume).toHaveBeenCalledOnce();
  });
});
