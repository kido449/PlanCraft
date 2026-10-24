/**
 * Executes an async action while strictly preserving the window scroll position,
 * preventing browser focus-reset scroll jumps and layout shifts.
 */
export async function withScrollLock<T>(action: () => Promise<T> | T): Promise<T> {
  const scrollYBefore = typeof window !== 'undefined' ? window.scrollY : 0;
  
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const result = await action();

  if (typeof window !== 'undefined') {
    window.scrollTo({ top: scrollYBefore, behavior: 'instant' });
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollYBefore, behavior: 'instant' });
      setTimeout(() => {
        if (Math.abs(window.scrollY - scrollYBefore) > 1) {
          window.scrollTo({ top: scrollYBefore, behavior: 'instant' });
        }
      }, 50);
    });
  }

  return result;
}

/**
 * Diagnostic logger for programmatically verifying zero net scroll shift.
 */
export async function measureScrollShift<T>(
  actionName: string,
  action: () => Promise<T> | T
): Promise<{ result: T; before: { scrollY: number; scrollHeight: number }; after: { scrollY: number; scrollHeight: number }; netShift: number }> {
  const before = {
    scrollY: window.scrollY,
    scrollHeight: document.body.scrollHeight,
  };

  const result = await action();

  // Wait a tick for DOM reflow
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 60));

  const after = {
    scrollY: window.scrollY,
    scrollHeight: document.body.scrollHeight,
  };

  const netShift = after.scrollY - before.scrollY;

  console.log(`[ScrollShift Audit] ${actionName}:`, {
    before,
    after,
    netShift: `${netShift}px`,
    stable: Math.abs(netShift) <= 2,
  });

  return { result, before, after, netShift };
}
