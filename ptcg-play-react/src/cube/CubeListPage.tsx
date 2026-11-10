import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { CubeDefinition, CubeDraftRoom } from './types';
import { CUBE_MAX_PLAYERS, CUBE_MIN_PLAYERS, normalizeCubeTargetSize } from './types';
import {
  createCubeDefinition,
  deleteCube,
  duplicateCube,
  getCubeClientId,
  getDraftRoom,
  listCubes,
  listDraftRooms,
  newDraftRoomCode,
  saveCube,
  saveDraftRoom,
  subscribeCubeStorage,
} from './cubeStorage';
import { createCubeDraftRoom, draftCardsRequired } from './draftEngine';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { deckListExportText } from '../deck-editor/deckListExportText';
import { FormAlert } from '../components/ui/FormAlert';
import { ShellButton } from '../components/ui/ShellButton';
import { TextField } from '../components/ui/TextField';
import styles from './CubeListPage.module.css';

function promptName(
  t: TFunction,
  title: string,
  existing: Set<string>,
): string | null {
  const raw = window.prompt(title, '');
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 32) {
    window.alert(t('CUBE_NAME_RULES'));
    return null;
  }
  if (existing.has(trimmed.toLowerCase())) {
    window.alert(t('CUBE_NAME_TAKEN'));
    return null;
  }
  return trimmed;
}

function phaseLabelKey(phase: CubeDraftRoom['phase']): string {
  if (phase === 'lobby') {
    return 'CUBE_PHASE_LOBBY';
  }
  if (phase === 'drafting') {
    return 'CUBE_PHASE_DRAFTING';
  }
  return 'CUBE_PHASE_COMPLETE';
}

export function CubeListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [cubes, setCubes] = useState<CubeDefinition[]>(() => listCubes());
  const [drafts, setDrafts] = useState<CubeDraftRoom[]>(() => listDraftRooms());
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setCubes(listCubes());
    setDrafts(listDraftRooms());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCubeStorage(refresh);
    window.addEventListener('focus', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const sortedCubes = useMemo(
    () => cubes.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [cubes],
  );

  const openDrafts = useMemo(
    () =>
      drafts
        .filter((room) => room.phase !== 'complete')
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [drafts],
  );

  const existingNames = useMemo(
    () => new Set(cubes.map((cube) => cube.name.trim().toLowerCase())),
    [cubes],
  );

  function hostNameFor(room: CubeDraftRoom): string {
    return room.seats.find((seat) => seat.clientId === room.hostId)?.name ?? '—';
  }

  function onCreateCube() {
    const name = promptName(t, t('CUBE_CREATE_PROMPT'), existingNames);
    if (!name) {
      return;
    }
    try {
      const cube = saveCube(
        createCubeDefinition(name, {
          userId: user?.userId ?? null,
          name: user?.name ?? 'Player',
        }),
      );
      refresh();
      navigate(`/cube/${cube.id}`);
    } catch {
      setError(t('CUBE_NOT_FOUND'));
    }
  }

  function onDeleteCube(cube: CubeDefinition) {
    if (!window.confirm(t('CUBE_DELETE_CONFIRM'))) {
      return;
    }
    deleteCube(cube.id);
    refresh();
  }

  function onDuplicateCube(cube: CubeDefinition) {
    const name = promptName(t, t('CUBE_CREATE_PROMPT'), existingNames);
    if (!name) {
      return;
    }
    const copy = duplicateCube(cube.id, name);
    if (copy) {
      refresh();
      navigate(`/cube/${copy.id}`);
    }
  }

  async function onCopyList(cube: CubeDefinition) {
    try {
      await navigator.clipboard.writeText(deckListExportText(cube.cards));
      showSnackbar(t('CUBE_COPIED'));
    } catch {
      setError(t('ERROR_CLIPBOARD_ACCESS'));
    }
  }

  function onHostDraft(cube: CubeDefinition) {
    setError(null);
    const needed = draftCardsRequired(CUBE_MIN_PLAYERS);
    if (cube.cards.length < needed) {
      setError(t('DRAFT_NEEDS_CARDS', { needed, players: CUBE_MIN_PLAYERS, count: cube.cards.length }));
      return;
    }
    const code = newDraftRoomCode();
    const room = createCubeDraftRoom({
      code,
      cube,
      hostClientId: getCubeClientId(),
      hostName: user?.name ?? 'Host',
      hostUserId: user?.userId ?? null,
    });
    saveDraftRoom(room);
    navigate(`/draft/${code}`);
  }

  function onJoinCode() {
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      return;
    }
    if (!getDraftRoom(code)) {
      setError(t('CUBE_JOIN_NOT_FOUND'));
      return;
    }
    navigate(`/draft/${code}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.cornerTL} aria-hidden />
      <div className={styles.cornerBR} aria-hidden />
      <div className={styles.scroll}>
        <div className={styles.content}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>{t('CUBE_TITLE')}</h1>
              <p className={styles.subtitle}>{t('CUBE_SUBTITLE')}</p>
            </div>
            <div className={styles.headerActions}>
              <ShellButton variant="primary" onClick={onCreateCube}>
                {t('CUBE_NEW_CUBE')}
              </ShellButton>
            </div>
          </header>

          <div className={styles.localNote}>{t('CUBE_LOCAL_NOTE')}</div>

          {error && <FormAlert>{error}</FormAlert>}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('CUBE_MY_CUBES')}</h2>
            {sortedCubes.length === 0 ? (
              <div className={styles.empty}>
                <p>{t('CUBE_EMPTY_CUBES')}</p>
                <ShellButton variant="ghost" onClick={onCreateCube}>
                  {t('CUBE_NEW_CUBE')}
                </ShellButton>
              </div>
            ) : (
              <div className={styles.cubeGrid}>
                {sortedCubes.map((cube) => {
                  const target = normalizeCubeTargetSize(cube.targetSize);
                  const short = Math.max(0, target - cube.cards.length);
                  return (
                    <article key={cube.id} className={styles.cubeCard}>
                      <button
                        type="button"
                        className={styles.cubeNameBtn}
                        onClick={() => navigate(`/cube/${cube.id}`)}
                      >
                        {cube.name}
                      </button>
                      <div className={styles.cubeCount}>
                        {t('CUBE_CARD_COUNT', { count: cube.cards.length, target })}
                      </div>
                      <div className={styles.progressTrack} aria-hidden>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${Math.min(100, (cube.cards.length / target) * 100)}%` }}
                        />
                      </div>
                      {short > 0 ? (
                        <div className={styles.shortHint}>
                          {t('CUBE_SHORT_OF_TARGET', { count: short, target })}
                        </div>
                      ) : null}
                      <div className={styles.cubeActions}>
                        <ShellButton variant="ghost" onClick={() => navigate(`/cube/${cube.id}`)}>
                          {t('CUBE_EDIT')}
                        </ShellButton>
                        <ShellButton variant="secondary" onClick={() => onHostDraft(cube)}>
                          {t('CUBE_HOST_DRAFT')}
                        </ShellButton>
                      </div>
                      <div className={styles.cubeSecondaryActions}>
                        <button type="button" onClick={() => onDuplicateCube(cube)}>
                          {t('CUBE_DUPLICATE')}
                        </button>
                        <button type="button" onClick={() => void onCopyList(cube)}>
                          {t('CUBE_COPY_LIST')}
                        </button>
                        <button type="button" className={styles.danger} onClick={() => onDeleteCube(cube)}>
                          {t('CUBE_DELETE')}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('CUBE_OPEN_DRAFTS')}</h2>
              <div className={styles.joinRow}>
                <TextField
                  id="cube-join-code"
                  label={t('CUBE_JOIN_CODE')}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onJoinCode();
                    }
                  }}
                  placeholder={t('CUBE_JOIN_CODE_PLACEHOLDER')}
                  autoComplete="off"
                  maxLength={6}
                  inputClassName={styles.joinInput}
                />
                <ShellButton variant="ghost" onClick={onJoinCode} disabled={!joinCode.trim()}>
                  {t('CUBE_JOIN')}
                </ShellButton>
              </div>
            </div>

            {openDrafts.length === 0 ? (
              <div className={styles.empty}>
                <p>{t('CUBE_NO_OPEN_DRAFTS')}</p>
              </div>
            ) : (
              <div className={styles.draftList}>
                {openDrafts.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={styles.draftRow}
                    onClick={() => navigate(`/draft/${room.id}`)}
                  >
                    <div className={styles.draftMain}>
                      <span className={styles.draftCube}>{room.cubeName}</span>
                      <span className={styles.draftMeta}>
                        {t('CUBE_DRAFT_BY', { name: hostNameFor(room) })}
                      </span>
                    </div>
                    <div className={styles.draftAside}>
                      <span className={styles.draftCode}>{room.id}</span>
                      <span className={styles.draftPhase}>{t(phaseLabelKey(room.phase))}</span>
                      <span className={styles.draftPlayers}>
                        {t('CUBE_DRAFT_PLAYERS', { count: room.seats.length })} / {CUBE_MAX_PLAYERS}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
