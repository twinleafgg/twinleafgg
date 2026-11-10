import { useEffect, useState } from 'react';
import type { BoardInteractionService } from '../BoardInteractionService';

/**
 * 3D projects a pixel HUD anchor each frame; 2D never does.
 * When a target is selected and no anchor exists, overlays should mount +/- in the choose bar.
 */
export function useDamageHudAnchorMode(boardInteraction: BoardInteractionService): {
  hasSelection: boolean;
  useBarControls: boolean;
} {
  const [hasSelection, setHasSelection] = useState(
    () => boardInteraction.getSelectedTargets().length > 0,
  );
  const [hasAnchor, setHasAnchor] = useState(
    () => boardInteraction.getRemoveDamageHudAnchor() !== null,
  );

  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) {
        return;
      }
      const nextHasSelection = boardInteraction.getSelectedTargets().length > 0;
      const nextHasAnchor = boardInteraction.getRemoveDamageHudAnchor() !== null;
      setHasSelection((prev) => (prev === nextHasSelection ? prev : nextHasSelection));
      setHasAnchor((prev) => (prev === nextHasAnchor ? prev : nextHasAnchor));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [boardInteraction]);

  return {
    hasSelection,
    useBarControls: hasSelection && !hasAnchor,
  };
}
