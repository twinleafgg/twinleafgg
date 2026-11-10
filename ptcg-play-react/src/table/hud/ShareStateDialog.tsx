import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  createSnapshotFromGame,
  createSnapshotFromMatch,
  createSnapshotFromReplay,
  downloadSnapshotFile,
} from '../../api/snapshotApi';
import { ApiError } from '../../api/apiError';
import { playSfx } from '../../sfx';
import styles from './ShareStatePrompt.module.css';

export type ShareStateDialogProps = {
  open: boolean;
  onClose: () => void;
  gameId?: number;
  matchId?: number;
  replayId?: number;
  replayPosition?: number;
};

export function ShareStateDialog(props: ShareStateDialogProps) {
  const { open, onClose, gameId, matchId, replayId, replayPosition = 0 } = props;
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [snapshotData, setSnapshotData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      let res;
      if (typeof gameId === 'number' && gameId > 0) {
        res = await createSnapshotFromGame(gameId);
      } else if (typeof matchId === 'number') {
        res = await createSnapshotFromMatch(matchId, replayPosition);
      } else if (typeof replayId === 'number') {
        res = await createSnapshotFromReplay(replayId, replayPosition);
      } else {
        setError(t('REACT_SHARE_STATE_ERROR', 'Nothing to share'));
        return;
      }
      setCode(res.code);
      setSnapshotData(res.snapshotData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('REACT_SHARE_STATE_ERROR', 'Failed to share state'));
    } finally {
      setBusy(false);
    }
  }, [gameId, matchId, replayId, replayPosition, t]);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      setCode(null);
      setSnapshotData(null);
      setCopied(false);
      return;
    }
    void create();
  }, [open, create]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose, open]);

  const copyLink = useCallback(async () => {
    if (!code) {
      return;
    }
    playSfx('uiButton');
    const link = `${window.location.origin}/snapshot/${code}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        return;
      }
    }
    setCopied(true);
  }, [code]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-state-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="share-state-title" className={styles.title}>
          {t('REACT_SHARE_STATE_TITLE', 'Share game state')}
        </h2>
        <p className={styles.message}>
          {t(
            'REACT_SHARE_STATE_HINT',
            'Anyone with this code or file can continue from this position as Play Both Sides.',
          )}
        </p>

        {busy && !code ? (
          <p className={styles.status}>{t('REACT_SHARE_STATE_CREATING', 'Creating share…')}</p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}

        {code ? (
          <>
            <div className={styles.codeBlock}>
              <span className={styles.codeLabel}>{t('REACT_SHARE_STATE_CODE', 'Share code')}</span>
              <code className={styles.codeValue}>{code}</code>
            </div>
            {copied ? (
              <p className={styles.copied}>{t('REACT_SHARE_STATE_COPIED', 'Link copied')}</p>
            ) : null}
          </>
        ) : null}

        <div className={styles.actions}>
          {code ? (
            <button type="button" className={styles.actionBtn} onClick={() => void copyLink()}>
              {t('REACT_SHARE_STATE_COPY', 'Copy link')}
            </button>
          ) : null}
          {code && snapshotData ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => {
                playSfx('uiButton');
                downloadSnapshotFile(snapshotData, code);
              }}
            >
              {t('REACT_SHARE_STATE_DOWNLOAD', 'Download file')}
            </button>
          ) : null}
          {!busy && error ? (
            <button type="button" className={styles.actionBtn} onClick={() => void create()}>
              {t('BUTTON_RETRY', 'Retry')}
            </button>
          ) : null}
          <span className={styles.actionsGrow} />
          <button
            type="button"
            className={styles.actionBtn}
            disabled={busy}
            onClick={() => {
              if (!busy) {
                playSfx('uiButton');
                onClose();
              }
            }}
          >
            {t('BUTTON_CLOSE', 'Close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
