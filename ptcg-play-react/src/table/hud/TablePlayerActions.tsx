import { useTranslation } from 'react-i18next';
import { GamePhase } from 'ptcg-server';
import type { LocalGameState } from '../types/localGameState';
import { ShellButton } from '../../components/ui/ShellButton';
import { cn } from '../../utils/cn';
import styles from './TablePlayerActions.module.css';

export type TablePlayerActionsProps = {
  localGame: LocalGameState;
  clientId: number;
  isPlaying: boolean;
  isObserver: boolean;
  onPassTurn: () => void;
  onUndo?: () => void;
  onShareState?: () => void;
  onLeave: () => void;
  onSwitchSides: () => void;
};

export function TablePlayerActions(props: TablePlayerActionsProps) {
  const { t } = useTranslation();
  const {
    localGame,
    clientId,
    isPlaying,
    isObserver,
    onPassTurn,
    onUndo,
    onShareState,
    onLeave,
    onSwitchSides,
  } = props;
  const state = localGame.state;
  const activePlayer = state.players[state.activePlayer];
  const isYourTurn =
    !!activePlayer &&
    activePlayer.id === clientId &&
    state.phase === GamePhase.PLAYER_TURN &&
    !localGame.replay;
  const undoEnabled = localGame.undoEnabled === true;
  const canUndo = localGame.canUndo === true;

  const deleted = localGame.deleted;

  return (
    <div className={styles.root}>
      {localGame.replay || isObserver ? (
        <>
          <ShellButton type="button" variant="secondary" className={styles.compactBtn} onClick={onSwitchSides}>
            {t('TABLE_SWITCH_SIDES')}
          </ShellButton>
          {onShareState ? (
            <ShellButton type="button" variant="secondary" className={styles.compactBtn} onClick={onShareState}>
              {t('TABLE_SHARE_STATE', 'Share')}
            </ShellButton>
          ) : null}
          <ShellButton type="button" variant="secondary" className={styles.compactBtn} onClick={onLeave}>
            {t('BUTTON_LEAVE')}
          </ShellButton>
        </>
      ) : null}
      {isPlaying ? (
        <>
          <ShellButton type="button" variant="secondary" className={styles.compactBtn} onClick={onLeave} disabled={!!deleted}>
            {t('BUTTON_LEAVE')}
          </ShellButton>
          {onShareState ? (
            <ShellButton type="button" variant="secondary" className={styles.compactBtn} onClick={onShareState} disabled={!!deleted}>
              {t('TABLE_SHARE_STATE', 'Share')}
            </ShellButton>
          ) : null}
          {undoEnabled && onUndo ? (
            <ShellButton
              type="button"
              variant="secondary"
              className={styles.compactBtn}
              onClick={onUndo}
              disabled={!canUndo || !!deleted}
              title={
                canUndo
                  ? undefined
                  : t('TABLE_UNDO_WAIT', 'Waiting for opponent to undo')
              }
            >
              {t('TABLE_UNDO', 'Undo')}
            </ShellButton>
          ) : null}
          <ShellButton type="button" className={cn(styles.compactBtn, styles.compactPrimary)} onClick={onPassTurn} disabled={!isYourTurn || !!deleted}>
            {t('TABLE_END_YOUR_TURN')}
          </ShellButton>
        </>
      ) : null}
    </div>
  );
}
