import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Rank } from 'ptcg-server';
import type { RankingInfo } from 'ptcg-server';
import { getRankingList } from '../api/rankingApi';
import { useAuth } from '../context/AuthContext';
import { appConfig } from '../env/config';
import { ApiError } from '../api/apiError';
import styles from './RankingPage.module.css';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function RankingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const loggedUserId = user?.userId ?? 0;

  const [ranking, setRanking] = useState<RankingInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounced(searchInput, 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = appConfig.defaultPageSize;

  const prevDebounced = useRef(debouncedSearch);
  useEffect(() => {
    if (prevDebounced.current !== debouncedSearch) {
      prevDebounced.current = debouncedSearch;
      setPageIndex(0);
    }
  }, [debouncedSearch]);

  const load = useCallback(async (page: number, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRankingList(page, query);
      setRanking(res.ranking.filter((row) => row.user.rank !== Rank.BANNED));
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('RANKING_FAILED_LOAD'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(pageIndex, debouncedSearch);
  }, [pageIndex, debouncedSearch, load]);

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const pageCount = maxPage + 1;
  const rangeStart = total > 0 ? pageIndex * pageSize + 1 : 0;
  const rangeEnd = total > 0 ? Math.min((pageIndex + 1) * pageSize, total) : 0;
  const rangeLabel =
    total > 0 ? t('RANKING_RANGE', { start: rangeStart, end: rangeEnd, total }) : '';

  return (
    <div className={styles.page}>
      <div className={styles.cornerTL} aria-hidden />
      <div className={styles.cornerBR} aria-hidden />
      <div className={styles.dots} aria-hidden />

      <div className={styles.scroll}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>{t('RANKING_TITLE')}</h1>
            <p className={styles.intro}>{t('RANKING_INTRO_BLURB', { pageSize })}</p>
          </header>

          <div className={styles.searchRow}>
            <input
              className={`tl-input ${styles.search}`}
              type="search"
              placeholder={t('RANKING_SEARCH_PLACEHOLDER')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {error ? <p className={`tl-alert ${styles.error}`}>{error}</p> : null}

          <div className={`tl-panel ${styles.tablePanel}`}>
            <table className={`tl-table ${styles.table}`}>
              <thead>
                <tr>
                  <th>{t('RANKING_COL_POSITION')}</th>
                  <th>{t('RANKING_COL_POINTS')}</th>
                  <th>{t('RANKING_COL_PLAYER')}</th>
                  <th>{t('RANKING_COL_ACTIONS')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className={styles.cellMuted}>
                      {t('RANKING_TABLE_LOADING')}
                    </td>
                  </tr>
                ) : ranking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.cellMuted}>
                      {t('RANKING_TABLE_EMPTY')}
                    </td>
                  </tr>
                ) : (
                  ranking.map((row) => (
                    <tr
                      key={row.user.userId}
                      className={row.user.userId === loggedUserId ? styles.rowSelf : undefined}
                    >
                      <td>{row.position}</td>
                      <td>{row.user.ranking}</td>
                      <td>{row.user.name}</td>
                      <td>
                        {row.user.userId !== loggedUserId && (
                          <Link className={styles.messageLink} to={`/message/${row.user.userId}`}>
                            {t('RANKING_ACTION_MESSAGE')}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={pageIndex <= 0 || loading}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              {t('RANKING_PREV_PAGE')}
            </button>
            <span className={styles.pageHint}>
              {t('RANKING_PAGE_OF', { current: pageIndex + 1, total: pageCount || 1 })}
              {total > 0 ? ` · ${rangeLabel}` : total === 0 && !loading ? ` · ${t('RANKING_ZERO_PLAYERS')}` : ''}
              {loading ? ` · ${t('RANKING_UPDATING')}` : ''}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={pageIndex >= maxPage || loading}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              {t('RANKING_NEXT_PAGE')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
