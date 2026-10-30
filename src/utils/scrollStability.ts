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
