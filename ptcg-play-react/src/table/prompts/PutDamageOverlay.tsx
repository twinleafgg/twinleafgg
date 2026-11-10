import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { merge } from 'rxjs';
import type { DamageMap, PutDamagePrompt } from 'ptcg-server';
import { PokemonCardList } from 'ptcg-server';
import type { LocalGameState } from '../types/localGameState';
import type { BoardInteractionService } from '../BoardInteractionService';
import { ShellButton } from '../../components/ui/ShellButton';
import { cn } from '../../utils/cn';
import {
  buildPutDamageResult,
  computeNetDamagePlaced,
  computePutAddRemoveDisabled,
  computePutInvalid,
  computePutRemaining,
} from './putDamagePromptModel';
import { findItemByTarget, patchDamageForTarget, targetsEqual, cardTargetKey } from './removeDamagePromptModel';
import { buildPokemonPromptRows, mapPokemonItems } from './pokemonPromptRows';
import type { PokemonRow } from './pokemonPromptRows';
import { getPromptPerspectivePlayerId } from './promptPerspective';
import { useDamageHudAnchorMode } from './useDamageHudAnchorMode';
import styles from './TablePromptLayer.module.css';

export type PutDamageOverlayProps = {
  prompt: PutDamagePrompt;
  localGame: LocalGameState;
  boardInteraction: BoardInteractionService;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
};

export function PutDamageOverlay(props: PutDamageOverlayProps) {
  const { prompt, localGame, boardInteraction, gameMessageText, resolve } = props;
  const { t } = useTranslation();
  const allowCancel = prompt.options.allowCancel;
  const allowPlacePartialDamage = !!prompt.options.allowPlacePartialDamage;
  const damageMultiple = prompt.options.damageMultiple ?? 10;
  const maxDamageMap = prompt.maxAllowedDamage;

  const [rows, setRows] = useState<PokemonRow[]>([]);
  const [initialDamageMap, setInitialDamageMap] = useState<DamageMap[]>([]);
  const [boardTick, setBoardTick] = useState(0);
  const floatingHudRef = useRef<HTMLDivElement>(null);
  const { useBarControls } = useDamageHudAnchorMode(boardInteraction);

  useEffect(() => {
    const sub = merge(boardInteraction.selectionMode$, boardInteraction.selectedTargets$).subscribe(() =>
      setBoardTick((x) => x + 1),
    );
    return () => sub.unsubscribe();
  }, [boardInteraction]);

  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) {
        return;
      }
      const el = floatingHudRef.current;
      if (el) {
        const hasSelection = boardInteraction.getSelectedTargets().length > 0;
        const p = boardInteraction.getRemoveDamageHudAnchor();
        if (hasSelection && p) {
          el.style.display = 'flex';
          el.style.left = `${p.x}px`;
          /* Anchor is bottom of card; sit controls just under that point */
          el.style.top = `${p.y + 10}px`;
        } else {
          el.style.display = 'none';
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [boardInteraction]);

  useEffect(() => {
    const nextRows = buildPokemonPromptRows(
      localGame.state,
      getPromptPerspectivePlayerId(prompt),
      prompt.playerType,
      prompt.slots,
    );
    setRows(nextRows);
    const initial: DamageMap[] = [];
    for (const row of nextRows) {
      for (const item of row.items) {
        if (item.cardList.cards.length > 0) {
          initial.push({ target: { ...item.target }, damage: item.cardList.damage });
        }
      }
    }
    setInitialDamageMap(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompt instance only
  }, [prompt.id]);

  useEffect(() => {
    const m = new Map<string, number>();
    for (const row of rows) {
      for (const item of row.items) {
        const initial = initialDamageMap.find(
          (i) =>
            i.target.player === item.target.player &&
            i.target.slot === item.target.slot &&
            i.target.index === item.target.index,
        );
        if (initial === undefined) {
          continue;
        }
        const delta = item.cardList.damage - initial.damage;
        if (delta > 0) {
          m.set(cardTargetKey(boardInteraction.toVisualCardTarget(item.target)), delta);
        }
      }
    }
    boardInteraction.setPutDamagePlacementPreview(m);
  }, [rows, initialDamageMap, boardInteraction]);

  const boardSelected = useMemo(() => {
    const list = boardInteraction.getPromptSelectedTargets();
    return list[0];
  }, [boardInteraction, boardTick]);

  const selectedItem = useMemo(() => findItemByTarget(rows, boardSelected), [rows, boardSelected]);

  const placed = useMemo(() => computeNetDamagePlaced(rows, initialDamageMap), [rows, initialDamageMap]);

  const remaining = useMemo(
    () => computePutRemaining(prompt.damage, placed),
    [prompt.damage, placed],
  );

  /** Show cumulative damage placed (0 → budget), not remaining budget counting down. */
  const hudDisplayValue = placed;

  const { remove: removeDisabled, add: addDisabled } = useMemo(
    () =>
      computePutAddRemoveDisabled(
        rows,
        selectedItem,
        initialDamageMap,
        maxDamageMap,
        prompt.damage,
        damageMultiple,
      ),
    [rows, selectedItem, initialDamageMap, maxDamageMap, prompt.damage, damageMultiple],
  );

  const isInvalid = useMemo(
    () => computePutInvalid(remaining, allowPlacePartialDamage),
    [remaining, allowPlacePartialDamage],
  );

  const removeDamage = useCallback(() => {
    const tSel = boardInteraction.getPromptSelectedTargets()[0];
    if (tSel === undefined) {
      return;
    }
    setRows((prev) => {
      const item = findItemByTarget(prev, tSel);
      if (!item) {
        return prev;
      }
      const init = initialDamageMap.find((i) => targetsEqual(i.target, tSel));
      const initD = init?.damage ?? 0;
      if (item.cardList.damage - damageMultiple < initD) {
        return prev;
      }
      if (item.cardList.damage <= initD) {
        return prev;
      }
      return patchDamageForTarget(prev, tSel, -damageMultiple);
    });
  }, [boardInteraction, initialDamageMap, damageMultiple]);

  const addDamage = useCallback(() => {
    const tSel = boardInteraction.getPromptSelectedTargets()[0];
    if (tSel === undefined) {
      return;
    }
    setRows((prev) => {
      const item = findItemByTarget(prev, tSel);
      if (!item) {
        return prev;
      }
      const placedNow = computeNetDamagePlaced(prev, initialDamageMap);
      const rem = computePutRemaining(prompt.damage, placedNow);
      if (rem < damageMultiple) {
        return prev;
      }
      const cap = maxDamageMap.find(
        (d) =>
          d.target.player === tSel.player &&
          d.target.slot === tSel.slot &&
          d.target.index === tSel.index,
      );
      if (cap !== undefined && item.cardList.damage + damageMultiple > cap.damage) {
        return prev;
      }
      return patchDamageForTarget(prev, tSel, damageMultiple);
    });
  }, [boardInteraction, initialDamageMap, prompt.damage, damageMultiple, maxDamageMap]);

  const reset = useCallback(() => {
    setRows((prev) =>
      mapPokemonItems(prev, (item) => {
        const initial = initialDamageMap.find(
          (i) =>
            i.target.player === item.target.player &&
            i.target.slot === item.target.slot &&
            i.target.index === item.target.index,
        );
        if (initial === undefined || item.cardList.damage === initial.damage) {
          return item;
        }
        const cardList = Object.assign(new PokemonCardList(), item.cardList);
        cardList.damage = initial.damage;
        return { ...item, cardList };
      }),
    );
  }, [initialDamageMap]);

  const onConfirm = useCallback(() => {
    if (isInvalid) {
      return;
    }
    resolve(prompt.id, buildPutDamageResult(rows, initialDamageMap));
    boardInteraction.endBoardSelection();
  }, [isInvalid, prompt.id, resolve, rows, initialDamageMap, boardInteraction]);

  const onCancel = useCallback(() => {
    if (!allowCancel) {
      return;
    }
    boardInteraction.endBoardSelection();
    resolve(prompt.id, null);
  }, [allowCancel, boardInteraction, prompt.id, resolve]);

  const message = gameMessageText(t, prompt.message);

  return (
    <>
      <div
        ref={floatingHudRef}
        className={styles.removeDamageFloatingHud}
        style={{ display: 'none' }}
        role="group"
        aria-label={t('PROMPT_PUT_DAMAGE_FLOATING_CONTROLS', { defaultValue: 'Place damage counters' })}
      >
        <ShellButton
          type="button"
          variant="secondary"
          className={styles.removeDamageRoundBtn}
          disabled={removeDisabled}
          onClick={removeDamage}
        >
          −
        </ShellButton>
        <span className={styles.removeDamagePending}>{hudDisplayValue}</span>
        <ShellButton
          type="button"
          variant="secondary"
          className={styles.removeDamageRoundBtn}
          disabled={addDisabled}
          onClick={addDamage}
        >
          +
        </ShellButton>
      </div>
      <div className={cn(styles.chooseBar, styles.chooseBarWrap)}>
        <div className={styles.chooseBarMessage}>{message}</div>
        <div className={styles.removeDamageBarControls}>
          {useBarControls ? (
            <div
              className={styles.removeDamageBarAdjust}
              role="group"
              aria-label={t('PROMPT_PUT_DAMAGE_FLOATING_CONTROLS', {
                defaultValue: 'Place damage counters',
              })}
            >
              <ShellButton
                type="button"
                variant="secondary"
                className={styles.removeDamageRoundBtn}
                disabled={removeDisabled}
                onClick={removeDamage}
              >
                −
              </ShellButton>
              <span className={styles.removeDamagePending}>{hudDisplayValue}</span>
              <ShellButton
                type="button"
                variant="secondary"
                className={styles.removeDamageRoundBtn}
                disabled={addDisabled}
                onClick={addDamage}
              >
                +
              </ShellButton>
            </div>
          ) : null}
          <ShellButton type="button" variant="secondary" onClick={reset}>
            {t('PROMPT_RESET', { defaultValue: 'Reset' })}
          </ShellButton>
        </div>
        <div className={styles.chooseBarActions}>
          {allowCancel ? (
            <ShellButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={!!localGame.deleted}
            >
              {t('BUTTON_CANCEL')}
            </ShellButton>
          ) : null}
          <ShellButton type="button" disabled={!!localGame.deleted || isInvalid} onClick={onConfirm}>
            {t('BUTTON_OK')}
          </ShellButton>
        </div>
      </div>
    </>
  );
}
