import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { getDeck, getDeckStats, saveDeck } from '../api/deckApi';
import { ApiError } from '../api/apiError';
import { FormAlert } from '../components/ui/FormAlert';
import { ShellButton } from '../components/ui/ShellButton';
import { ArchetypeSelectDialog, type ArchetypeSlotValue } from '../games/ArchetypeSelectDialog';
import { ArchetypeIcon } from '../games/ArchetypeIcon';
import { deckArchetypeForDisplay } from '../games/deckArchetypeDisplay';
import { matchupArchetypesFromLabel } from '../games/matchupArchetypeFromLabel';
import type { Deck, DeckStatsResponse } from '../types/responses';
import styles from './DeckStatsPage.module.css';

const REPLAY_LIMIT = 100;

function winRateBand(winRate: number): 'favorable' | 'even' | 'unfavorable' {
  if (winRate >= 60) {
    return 'favorable';
  }
  if (winRate >= 40) {
    return 'even';
  }
  return 'unfavorable';
}

export function DeckStatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [stats, setStats] = useState<DeckStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archetypeDialogOpen, setArchetypeDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(deckId)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [deckRes, statsRes] = await Promise.all([getDeck(deckId), getDeckStats(deckId, REPLAY_LIMIT)]);
      setDeck(deckRes.deck);
      setStats(statsRes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('ERROR_UNKNOWN'));
      setDeck(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [deckId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onArchetypeSave = useCallback(
    async (archetype1: ArchetypeSlotValue, archetype2: ArchetypeSlotValue) => {
      if (!deck) {
        return;
      }
      setError(null);
      try {
        const res = await saveDeck(
          deck.id,
          deck.name,
          deck.cards,
          archetype1,
          archetype2,
          deck.artworks,
          deck.sleeveIdentifier,
        );
        setDeck(res.deck);
        setToast(t('DECK_EDIT_SAVED'));
        window.setTimeout(() => setToast(null), 2400);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('ERROR_UNKNOWN'));
      }
    },
    [deck, t],
  );

  if (!Number.isFinite(deckId)) {
    return <p className={styles.loading}>{t('REACT_INVALID_DECK')}</p>;
  }

  if (loading) {
    return <div className={styles.loading}>{t('REACT_DECK_STATS_LOADING')}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.cornerTL} aria-hidden />
      <div className={styles.cornerBR} aria-hidden />
      <div className={styles.dots} aria-hidden />

      <div className={styles.scroll}>
        <div className={styles.content}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/deck')}
          aria-label={t('REACT_DECK_STATS_BACK_ARIA')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        {stats && deck ? (
          <>
            <h1 className={styles.deckName}>{deck.name}</h1>
            <div className={styles.archetypeRow}>
              <div className={styles.archetypeWrap}>
                <ArchetypeIcon archetypes={deckArchetypeForDisplay(deck)} scale={2} />
              </div>
              <button
                type="button"
                className={styles.archetypeEditBtn}
                aria-label={t('REACT_ARCHETYPE_SELECT_EDIT_ARIA')}
                onClick={() => setArchetypeDialogOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
            </div>
            <ShellButton
              type="button"
              variant="ghost"
              className={styles.editBtn}
              onClick={() => navigate(`/deck/${deckId}`)}
            >
              {t('REACT_DECK_STATS_EDIT_DECK')}
            </ShellButton>
          </>
        ) : null}
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}
      {toast ? <div className={styles.toast}>{toast}</div> : null}

      {stats && deck ? (
        <>
          <ArchetypeSelectDialog
            open={archetypeDialogOpen}
            onClose={() => setArchetypeDialogOpen(false)}
            initialArchetype1={deck.manualArchetype1}
            initialArchetype2={deck.manualArchetype2}
            onSave={(a1, a2) => {
              void onArchetypeSave(a1, a2);
            }}
          />
          <div className={styles.summary}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalGames}</div>
              <div className={styles.statLabel}>{t('REACT_DECK_STATS_TOTAL_GAMES')}</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardWin}`}>
              <div className={styles.statValue}>{stats.wins}</div>
              <div className={styles.statLabel}>{t('REACT_DECK_STATS_WINS')}</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardLoss}`}>
              <div className={styles.statValue}>{stats.losses}</div>
              <div className={styles.statLabel}>{t('REACT_DECK_STATS_LOSSES')}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.winRate.toFixed(1)}%</div>
              <div className={styles.statLabel}>{t('REACT_DECK_STATS_WIN_RATE')}</div>
            </div>
          </div>

          <section className={styles.section} aria-labelledby="deck-stats-matchups">
            <h2 id="deck-stats-matchups" className={styles.sectionTitle}>
              {t('REACT_DECK_STATS_MATCHUPS_TITLE')}
            </h2>
            {stats.matchups.length > 0 ? (
              <div className={styles.matchupsGrid}>
                {stats.matchups.map((m) => {
                  const band = winRateBand(m.winRate);
                  const cardClass =
                    band === 'favorable'
                      ? styles.matchupFavorable
                      : band === 'even'
                        ? styles.matchupEven
                        : styles.matchupUnfavorable;
                  const wrClass =
                    band === 'favorable'
                      ? styles.winrateFavorable
                      : band === 'even'
                        ? styles.winrateEven
                        : styles.winrateUnfavorable;
                  return (
                    <div key={m.archetype} className={`${styles.matchupCard} ${cardClass}`}>
                      <div className={styles.matchupIcon}>
                        <ArchetypeIcon archetypes={matchupArchetypesFromLabel(m.archetype)} scale={2.5} />
                      </div>
                      <div className={styles.matchupName}>{m.archetype}</div>
                      <div className={styles.matchupRecord}>
                        <span className={styles.wins}>{m.wins}W</span>
                        <span className={styles.sep}>-</span>
                        <span className={styles.losses}>{m.losses}L</span>
                      </div>
                      <div className={`${styles.matchupWinrate} ${wrClass}`}>{m.winRate.toFixed(1)}%</div>
                      <div className={styles.matchupGames}>
                        {t('REACT_DECK_STATS_GAMES_COUNT', { count: m.games })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyBox}>
                <p>{t('REACT_DECK_STATS_NO_MATCHUPS')}</p>
              </div>
            )}
          </section>

          <section className={`${styles.section} ${styles.replaysSection}`} aria-labelledby="deck-stats-replays">
            <h2 id="deck-stats-replays" className={styles.sectionTitle}>
              {t('REACT_DECK_STATS_REPLAYS_TITLE')}
            </h2>
            {stats.replays.length > 0 ? (
              <>
                {stats.totalReplays != null &&
                stats.replayLimit != null &&
                stats.totalReplays > stats.replayLimit ? (
                  <p className={styles.hint}>
                    {t('REACT_DECK_STATS_REPLAYS_HINT', {
                      limit: stats.replayLimit,
                      total: stats.totalReplays,
                    })}
                  </p>
                ) : null}
                <div className={styles.tablePanel}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t('REACT_DECK_STATS_COL_OPPONENT')}</th>
                        <th>{t('REACT_DECK_STATS_COL_DATE')}</th>
                        <th>{t('REACT_DECK_STATS_COL_RESULT')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.replays.map((r) => (
                        <tr key={r.matchId}>
                          <td>{r.opponentName}</td>
                          <td>{new Date(r.created).toLocaleDateString()}</td>
                          <td>
                            <span className={r.won ? styles.badgeWin : styles.badgeLoss}>
                              {r.won ? t('REACT_DECK_STATS_RESULT_WIN') : t('REACT_DECK_STATS_RESULT_LOSS')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className={styles.emptyBox}>
                <p>{t('REACT_DECK_STATS_NO_REPLAYS')}</p>
              </div>
            )}
          </section>
        </>
      ) : null}
        </div>
      </div>
    </div>
  );
}
