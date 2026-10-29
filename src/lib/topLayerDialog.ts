/**
 * Modern Web Guidance helpers for `<dialog closedby="any">`:
 * 1. Light-dismiss coordinate fallback for browsers lacking `HTMLDialogElement.prototype.closedBy` (e.g. Safari).
 * 2. Discrete `display` transition probe & `data-closing` top-layer exit animation fallback.
 */

let supportsDisplayTransition: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    typeof window === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.CSS?.supports?.('overlay', 'auto')) &&
    canTransitionDisplay()
  );
}

export async function closeTopLayerDialog(dialog: HTMLDialogElement | null): Promise<void> {
  if (!dialog || !dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }

  dialog.close();
}

export function attachDialogFallbacks(
  dialog: HTMLDialogElement | null,
  onRequestClose: () => void
): () => void {
  if (!dialog) return () => {};

  const handleCancel = (event: Event) => {
    event.preventDefault();
    onRequestClose();
  };

  dialog.addEventListener('cancel', handleCancel);

  // Fallback for browsers without native `<dialog closedby="any">` support (Safari)
  let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      onRequestClose();
    };
    dialog.addEventListener('click', handleBackdropClick);
  }

  return () => {
    dialog.removeEventListener('cancel', handleCancel);
    if (handleBackdropClick) {
      dialog.removeEventListener('click', handleBackdropClick);
    }
  };
}
