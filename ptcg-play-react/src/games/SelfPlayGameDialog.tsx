import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Format, GameSettings, Rules } from 'ptcg-server';
import { useAuth } from '../context/AuthContext';
import { useCoreSession } from '../context/CoreSessionContext';
import { useSnackbar } from '../context/SnackbarContext';
import { getDeck, getDeckList } from '../api/deckApi';
import { ApiError } from '../api/apiError';
import type { DeckListEntry } from '../types/responses';
import { formatOptionLabel } from '../deck-editor/formatLabelI18n';
import { CREATE_GAME_FORMAT_VALUES } from './matchFormats';
import { pickDefaultDeckIdForFormat, validDecksForFormat } from './deckDefaultPreferences';
import { CheckboxField } from '../components/ui/CheckboxField';
import { Modal } from '../components/ui/Modal';
import { SelectField } from '../components/ui/SelectField';
import { toGameSettingsPayload } from '../game/gameSettingsPayload';
import { GAME_RULE_OPTIONS } from './gameRuleOptions';
import styles from './CreateGameInviteDialog.module.css';

const TIME_LIMIT_OPTIONS: { value: number; labelKey: string }[] = [
  { value: 0, labelKey: 'GAMES_LIMIT_NO_LIMIT' },
  { value: 600, labelKey: 'GAMES_LIMIT_10_MIN' },
  { value: 900, labelKey: 'GAMES_LIMIT_15_MIN' },
  { value: 1200, labelKey: 'GAMES_LIMIT_20_MIN' },
  { value: 1500, labelKey: 'GAMES_LIMIT_25_MIN' },
  { value: 1800, labelKey: 'GAMES_LIMIT_30_MIN' },
];

export type SelfPlayGameDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SelfPlayGameDialog({ open, onClose }: SelfPlayGameDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createSelfPlayGame } = useCoreSession();
  const { showSnackbar } = useSnackbar();

  const isAdmin = user?.roleId === 4;

  const [allDecks, setAllDecks] = useState<DeckListEntry[]>([]);
  const [format, setFormat] = useState<Format>(Format.STANDARD);
  const [deckId, setDeckId] = useState<number | null>(null);
  const [secondDeckId, setSecondDeckId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState(1200);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxAllPokemonBasic, setSandboxAllPokemonBasic] = useState(false);
  const [sandboxAttacksCostNoEnergy, setSandboxAttacksCostNoEnergy] = useState(false);
  const [sandboxRetreatCostsNoEnergy, setSandboxRetreatCostsNoEnergy] = useState(false);
  const [rules, setRules] = useState<Rules>(() => new Rules());
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setRecordingEnabled(!isAdmin);
    setSandboxMode(false);
    setSandboxAllPokemonBasic(false);
    setSandboxAttacksCostNoEnergy(false);
    setSandboxRetreatCostsNoEnergy(false);
    setRules(new Rules());
    setError(null);
    setFormat(Format.STANDARD);
    setTimeLimit(1200);
  }, [open, isAdmin]);

  useEffect(() => {
    if (!sandboxMode) {
      setSandboxAllPokemonBasic(false);
      setSandboxAttacksCostNoEnergy(false);
      setSandboxRetreatCostsNoEnergy(false);
    }
  }, [sandboxMode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoadingDecks(true);
    void (async () => {
      try {
        const res = await getDeckList({ summary: true });
        if (cancelled) {
          return;
        }
        setAllDecks(res.decks);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : t('REACT_ERROR_LOAD_DECKS'));
          setAllDecks([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingDecks(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const validDecks = useMemo(() => validDecksForFormat(allDecks, format), [allDecks, format]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (validDecks.length === 0) {
      setDeckId(null);
      setSecondDeckId(null);
      return;
    }
    const defaultId = pickDefaultDeckIdForFormat(validDecks, format);
    setDeckId(defaultId);
    setSecondDeckId(defaultId);
  }, [open, format, validDecks]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onConfirm = useCallback(async () => {
    if (deckId == null || secondDeckId == null || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const [deckRes1, deckRes2] = await Promise.all([getDeck(deckId), getDeck(secondDeckId)]);
      let cards1 = deckRes1.deck.cards;
      let cards2 = deckRes2.deck.cards;
      if (!cards1?.length) {
        const full = await getDeck(deckId);
        cards1 = full.deck.cards;
      }
      if (!cards2?.length) {
        const full = await getDeck(secondDeckId);
        cards2 = full.deck.cards;
      }
      if (!cards1?.length || !cards2?.length) {
        setError(t('REACT_ERROR_LOAD_DECKS'));
        return;
      }
      const gs = new GameSettings();
      gs.format = format;
      gs.timeLimit = timeLimit;
      gs.recordingEnabled = recordingEnabled;
      gs.sandboxMode = isAdmin ? sandboxMode : false;
      if (gs.sandboxMode) {
        gs.sandboxAllPokemonBasic = sandboxAllPokemonBasic;
        gs.sandboxAttacksCostNoEnergy = sandboxAttacksCostNoEnergy;
        gs.sandboxRetreatCostsNoEnergy = sandboxRetreatCostsNoEnergy;
      }
      gs.rules = rules;
      gs.selfPlay = true;

      const gameState = await createSelfPlayGame(
        cards1,
        cards2,
        toGameSettingsPayload(gs),
        deckId,
        secondDeckId,
        deckRes1.deck.sleeveImagePath,
        deckRes2.deck.sleeveImagePath,
        deckRes1.deck.deckBoxImagePath,
        deckRes2.deck.deckBoxImagePath,
        deckRes1.deck.coinImagePath,
        deckRes2.deck.coinImagePath,
      );
      showSnackbar(t('REACT_SELF_PLAY_SNACKBAR'));
      onClose();
      navigate(`/table/${gameState.gameId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('REACT_ERROR_CREATE_GAME'));
    } finally {
      setSubmitting(false);
    }
  }, [
    deckId,
    secondDeckId,
    submitting,
    format,
    timeLimit,
    recordingEnabled,
    sandboxMode,
    sandboxAllPokemonBasic,
    sandboxAttacksCostNoEnergy,
    sandboxRetreatCostsNoEnergy,
    rules,
    isAdmin,
    createSelfPlayGame,
    navigate,
    onClose,
    showSnackbar,
    t,
  ]);

  if (!open) {
    return null;
  }

  const canSubmit =
    deckId != null &&
    secondDeckId != null &&
    validDecks.length > 0 &&
    !loadingDecks &&
    !submitting;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <Modal
        className={styles.panel}
        aria-labelledby="self-play-game-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="self-play-game-title" className={styles.title}>
          {t('REACT_SELF_PLAY_TITLE')}
        </h2>

        <div className={styles.field}>
          <label htmlFor="selfplay-format">{t('LABEL_FORMAT_SHORT')}</label>
          <SelectField
            id="selfplay-format"
            className={styles.select}
            value={format}
            disabled={submitting}
            onChange={(e) => setFormat(Number(e.target.value) as Format)}
          >
            {CREATE_GAME_FORMAT_VALUES.map((f) => (
              <option key={f} value={f}>
                {formatOptionLabel(t, f)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className={styles.field}>
          <label htmlFor="selfplay-deck-a">{t('REACT_SELF_PLAY_DECK_SIDE_A')}</label>
          <SelectField
            id="selfplay-deck-a"
            className={styles.select}
            value={deckId ?? ''}
            disabled={submitting || validDecks.length === 0}
            onChange={(e) => setDeckId(Number(e.target.value))}
          >
            {validDecks.length === 0 ? (
              <option value="">{t('NO_DECK')}</option>
            ) : (
              validDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))
            )}
          </SelectField>
        </div>

        <div className={styles.field}>
          <label htmlFor="selfplay-deck-b">{t('REACT_SELF_PLAY_DECK_SIDE_B')}</label>
          <SelectField
            id="selfplay-deck-b"
            className={styles.select}
            value={secondDeckId ?? ''}
            disabled={submitting || validDecks.length === 0}
            onChange={(e) => setSecondDeckId(Number(e.target.value))}
          >
            {validDecks.length === 0 ? (
              <option value="">{t('NO_DECK')}</option>
            ) : (
              validDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))
            )}
          </SelectField>
        </div>

        <div className={styles.field}>
          <label htmlFor="selfplay-time">{t('REACT_CREATE_GAME_TIME_LIMIT')}</label>
          <SelectField
            id="selfplay-time"
            className={styles.select}
            value={timeLimit}
            disabled={submitting}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
          >
            {TIME_LIMIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className={styles.field}>
          <CheckboxField
            plain
            className={styles.checkboxRow}
            checked={recordingEnabled}
            disabled={submitting}
            onChange={(e) => setRecordingEnabled(e.target.checked)}
          >
            {t('REACT_CREATE_GAME_RECORDING')}
          </CheckboxField>
        </div>

        {isAdmin ? (
          <div className={styles.field}>
            <CheckboxField
              plain
              className={styles.checkboxRow}
              checked={sandboxMode}
              disabled={submitting}
              onChange={(e) => setSandboxMode(e.target.checked)}
            >
              {t('GAMES_SANDBOX_MODE')}
            </CheckboxField>
            {sandboxMode ? (
              <div className={styles.sandboxOptions}>
                <CheckboxField
                  plain
                  className={styles.checkboxRow}
                  checked={sandboxAllPokemonBasic}
                  disabled={submitting}
                  onChange={(e) => setSandboxAllPokemonBasic(e.target.checked)}
                >
                  {t('GAMES_SANDBOX_ALL_POKEMON_BASIC')}
                </CheckboxField>
                <CheckboxField
                  plain
                  className={styles.checkboxRow}
                  checked={sandboxAttacksCostNoEnergy}
                  disabled={submitting}
                  onChange={(e) => setSandboxAttacksCostNoEnergy(e.target.checked)}
                >
                  {t('GAMES_SANDBOX_ATTACKS_NO_ENERGY')}
                </CheckboxField>
                <CheckboxField
                  plain
                  className={styles.checkboxRow}
                  checked={sandboxRetreatCostsNoEnergy}
                  disabled={submitting}
                  onChange={(e) => setSandboxRetreatCostsNoEnergy(e.target.checked)}
                >
                  {t('GAMES_SANDBOX_RETREAT_NO_ENERGY')}
                </CheckboxField>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.rulesSection}>
          <h3 className={styles.rulesTitle}>{t('REACT_GAME_RULES_TITLE')}</h3>
          <div className={styles.rulesGrid}>
            {GAME_RULE_OPTIONS.map((option) => (
              <CheckboxField
                key={option.key}
                plain
                className={styles.checkboxRow}
                checked={rules[option.key] === true}
                disabled={submitting}
                onChange={(e) => setRules({ ...rules, [option.key]: e.target.checked })}
              >
                {t(option.labelKey)}
              </CheckboxField>
            ))}
          </div>
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} disabled={submitting} onClick={onClose}>
            {t('BUTTON_CANCEL')}
          </button>
          <button type="button" className={styles.confirmBtn} disabled={!canSubmit} onClick={() => void onConfirm()}>
            {submitting ? t('REACT_SUBMITTING') : t('BUTTON_SELF_PLAY_START')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
