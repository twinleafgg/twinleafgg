import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo, type ReactNode } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCoreSession } from '../context/CoreSessionContext';
import { SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '../i18n/languages';
import { partitionMyGames } from '../games/myGamesClassify';
import { SelectField } from './ui/SelectField';
import { playSfx } from '../sfx';
import { UserAccountMenu } from './UserAccountMenu';
import styles from './AppLayout.module.css';

function NavLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={className} onClick={() => playSfx('uiNavslide')}>
      {children}
    </Link>
  );
}

function isDeckEditorPath(pathname: string): boolean {
  return /^\/deck\/[^/]+\/?$/.test(pathname);
}

function isTablePath(pathname: string): boolean {
  return (
    /^\/table\/replay\/[^/]+\/?$/.test(pathname) ||
    /^\/table\/saved-replay\/[^/]+\/?$/.test(pathname) ||
    /^\/table\/[^/]+\/?$/.test(pathname)
  );
}

function isParentMapPath(pathname: string): boolean {
  return pathname === '/parent' || pathname.startsWith('/parent/');
}

function isMyGamesPath(pathname: string): boolean {
  return pathname === '/my-games' || pathname.startsWith('/my-games/');
}

function isGamesPath(pathname: string): boolean {
  return pathname === '/games' || pathname.startsWith('/games/');
}

function isBattlePassPath(pathname: string): boolean {
  return pathname === '/battle-pass' || pathname.startsWith('/battle-pass/');
}

function isMessagesPath(pathname: string): boolean {
  return pathname === '/message' || pathname.startsWith('/message/');
}

function isProfilePath(pathname: string): boolean {
  return pathname === '/profile' || pathname.startsWith('/profile/');
}

function isDeckCustomizePath(pathname: string): boolean {
  return /^\/deck\/[^/]+\/customize\/?$/.test(pathname);
}

function isDeckStatsPath(pathname: string): boolean {
  return /^\/deck\/[^/]+\/stats\/?$/.test(pathname);
}

function isDeckListPath(pathname: string): boolean {
  return pathname === '/deck';
}

function isRankingPath(pathname: string): boolean {
  return pathname === '/ranking' || pathname.startsWith('/ranking/');
}

function isFriendsPath(pathname: string): boolean {
  return pathname === '/friends' || pathname.startsWith('/friends/');
}

function isSettingsPath(pathname: string): boolean {
  return pathname === '/settings' || pathname.startsWith('/settings/');
}

export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { language, setLanguage, labels } = useLanguage();
  const { user } = useAuth();
  const { games, clientId } = useCoreSession();
  const isAdmin = user?.roleId === 4;
  const deckEditorFullBleed = isDeckEditorPath(pathname);
  const deckCustomizeFullBleed = isDeckCustomizePath(pathname);
  const tableFullBleed = isTablePath(pathname);
  const parentMap = isParentMapPath(pathname);
  const myGamesBleed = isMyGamesPath(pathname);
  const gamesBleed = isGamesPath(pathname);
  const battlePassBleed = isBattlePassPath(pathname);
  const messagesBleed = isMessagesPath(pathname);
  const profileBleed = isProfilePath(pathname);
  const rankingBleed = isRankingPath(pathname);
  const deckListBleed = isDeckListPath(pathname);
  const deckStatsBleed = isDeckStatsPath(pathname);
  const friendsBleed = isFriendsPath(pathname);
  const settingsBleed = isSettingsPath(pathname);
  const mainBleed =
    deckEditorFullBleed ||
    deckCustomizeFullBleed ||
    tableFullBleed ||
    myGamesBleed ||
    gamesBleed ||
    battlePassBleed ||
    messagesBleed ||
    profileBleed ||
    rankingBleed ||
    deckListBleed ||
    deckStatsBleed ||
    friendsBleed ||
    settingsBleed;

  const incomingInviteCount = useMemo(() => {
    const { incoming } = partitionMyGames(games, clientId, user?.userId ?? 0);
    return incoming.length;
  }, [games, clientId, user?.userId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
      }}
    >
      {!tableFullBleed && (
        <header
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid #ccc',
            flexShrink: 0,
          }}
        >
          <strong>{t('REACT_SHELL_TITLE')}</strong>
          <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <NavLink to="/games">{t('MAIN_GAMES')}</NavLink>
            <NavLink to="/my-games" className={styles.navLinkWithBadge}>
              {t('MAIN_MY_GAMES')}
              {incomingInviteCount > 0 ? (
                <span className={styles.navBadge} aria-label={t('REACT_MY_GAMES_BADGE_ARIA', { count: incomingInviteCount })}>
                  {incomingInviteCount}
                </span>
              ) : null}
            </NavLink>
            <NavLink to="/spectate">{t('MAIN_SPECTATE')}</NavLink>
            <NavLink to="/replays">{t('MAIN_REPLAYS')}</NavLink>
            <NavLink to="/deck">{t('DECK_TITLE')}</NavLink>
            <NavLink to="/ranking">{t('MAIN_RANKING')}</NavLink>
            <NavLink to="/friends">{t('MAIN_FRIENDS')}</NavLink>
            <NavLink to="/message">{t('MAIN_MESSAGES')}</NavLink>
            <NavLink to="/battle-pass">{t('MAIN_BATTLE_PASS')}</NavLink>
            <NavLink to="/parent">Parents</NavLink>
            <NavLink to="/settings">{t('BUTTON_SETTINGS')}</NavLink>
            {isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
          </nav>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <SelectField
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguageCode)}
              aria-label={t('LABEL_LANGUAGE')}
              title={t('LABEL_LANGUAGE')}
            >
              {SUPPORTED_LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>
                  {labels[code]}
                </option>
              ))}
            </SelectField>
          </label>
          <UserAccountMenu />
        </header>
      )}
      <main
        style={{
          padding: mainBleed ? 0 : 20,
          flex: 1,
          minHeight: 0,
          overflowX: parentMap ? 'auto' : 'hidden',
          overflowY:
            tableFullBleed ||
            deckCustomizeFullBleed ||
            myGamesBleed ||
            battlePassBleed ||
            messagesBleed
              ? 'hidden'
              : parentMap
                ? 'hidden'
                : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
