import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/ui/Modal';
import { ShellButton } from '../components/ui/ShellButton';
import { playSnapshot } from '../api/snapshotApi';
import { ApiError } from '../api/apiError';
import styles from './CreateGameInviteDialog.module.css';

export type PlayFromSnapshotDialogProps = {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  autoPlay?: boolean;
};

export function PlayFromSnapshotDialog(props: PlayFromSnapshotDialogProps) {
  const { open, onClose, initialCode = '', autoPlay = false } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoPlayed = useRef(false);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const playCode = useCallback(async (override?: string) => {
    const trimmed = (override ?? code).trim().toUpperCase();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await playSnapshot({ code: trimmed });
      onClose();
      navigate(`/table/${res.game.gameId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('REACT_SNAPSHOT_PLAY_ERROR', 'Could not open snapshot'));
    } finally {
      setBusy(false);
    }
  }, [code, navigate, onClose, t]);

  useEffect(() => {
    if (!open || !autoPlay || autoPlayed.current || !initialCode.trim()) {
      return;
    }
    autoPlayed.current = true;
    void playCode(initialCode);
  }, [autoPlay, initialCode, open, playCode]);

  const playFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const text = await file.text();
        const res = await playSnapshot({ snapshotData: text.trim() });
        onClose();
        navigate(`/table/${res.game.gameId}`);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('REACT_SNAPSHOT_PLAY_ERROR', 'Could not open snapshot'));
      } finally {
        setBusy(false);
      }
    },
    [navigate, onClose, t],
  );

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <Modal
        className={styles.panel}
        aria-labelledby="play-snapshot-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="play-snapshot-title" className={styles.title}>
          {t('REACT_SNAPSHOT_PLAY_TITLE', 'Play from shared state')}
        </h2>
        <p className={styles.field}>
          {t(
            'REACT_SNAPSHOT_PLAY_HINT',
            'Enter a share code or import a .ptcgsnap file to start Play Both Sides from that position.',
          )}
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.field}>
          <label htmlFor="snapshot-code">{t('REACT_SHARE_STATE_CODE', 'Share code')}</label>
          <input
            id="snapshot-code"
            className={styles.select}
            value={code}
            disabled={busy}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD2345"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="snapshot-file">{t('REACT_SNAPSHOT_IMPORT_FILE', 'Import file')}</label>
          <input
            id="snapshot-file"
            type="file"
            accept=".ptcgsnap,application/octet-stream,text/plain"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void playFile(file);
              }
            }}
          />
        </div>
        <div className={styles.actions}>
          <ShellButton type="button" variant="secondary" disabled={busy} onClick={onClose}>
            {t('BUTTON_CANCEL')}
          </ShellButton>
          <ShellButton type="button" disabled={busy || !code.trim()} onClick={() => void playCode(undefined)}>
            {t('REACT_SNAPSHOT_PLAY', 'Play Both Sides')}
          </ShellButton>
        </div>
      </Modal>
    </div>,
    document.body,
  );
}
