type BRDelayResult = { completed: boolean; remaining: number };

export const BRDelay = (ms: number, signal?: AbortSignal): Promise<BRDelayResult> => {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      return resolve({ completed: false, remaining: ms });
    }

    let remaining = ms;
    let lastTime = performance.now();
    let rafId: number | null = null;

    const onAbort = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resolve({ completed: false, remaining: Math.max(0, remaining) });
    };

    const tick = (now: number) => {
      if (signal?.aborted) {
        return;
      }

      const dt = Math.min(Math.max(0, now - lastTime), 100);
      lastTime = now;
      remaining -= dt;

      if (remaining <= 0) {
        signal?.removeEventListener('abort', onAbort);
        resolve({ completed: true, remaining: 0 });
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    rafId = requestAnimationFrame(tick);
  });
};
