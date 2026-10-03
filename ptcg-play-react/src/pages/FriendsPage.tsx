import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { UserInfo } from 'ptcg-server';
import {
  acceptFriendRequest,
  blockFriendUser,
  cancelFriendRequest,
  type FriendInfoDto,
  type FriendRequestInfoDto,
  getFriendsList,
  getPendingFriendRequests,
  getSentFriendRequests,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  unblockFriendUser,
} from '../api/friendsApi';
import { useAuth } from '../context/AuthContext';
import { useCoreSession } from '../context/CoreSessionContext';
import { useSnackbar } from '../context/SnackbarContext';
import { ApiError } from '../api/apiError';
import { Modal } from '../components/ui/Modal';
import { resolveAvatarUrl } from '../utils/avatarUrl';
import styles from './FriendsPage.module.css';

type TabId = 'friends' | 'pending' | 'sent';

function otherInFriendship(f: FriendInfoDto, myUserId: number): UserInfo {
  return f.user.userId === myUserId ? f.friend : f.user;
}

function mergeUser(
  uid: number,
  map: Record<number, UserInfo>,
  sessionUsers: Record<number, UserInfo>,
): UserInfo {
  return sessionUsers[uid] ?? map[uid];
}

function TabFriendsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.999 1.999 0 0 0 18.06 7c-.8 0-1.54.5-1.85 1.26l-1.92 5.75c-.15.45-.23.93-.23 1.41V22h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2.5 16v-7H6V9.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h2v4.5c0 .83-.67 1.5-1.5 1.5S8 16.33 8 15.5V14H6.5v8H8z" />
    </svg>
  );
}

function TabMailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

function TabSendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function PanelPeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.47 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm2.78 1.58c-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57c0-.81-.48-1.53-1.22-1.85zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
    </svg>
  );
}

export function FriendsPage() {
  const { t, i18n } = useTranslation();
  const { user, serverConfig } = useAuth();
  const { clients, usersById } = useCoreSession();
  const { showSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState<TabId>('friends');
  const [friendRows, setFriendRows] = useState<FriendInfoDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestInfoDto[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestInfoDto[]>([]);
  const [userMap, setUserMap] = useState<Record<number, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [receiverIdRaw, setReceiverIdRaw] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  const onlineIds = useMemo(() => new Set(clients.map((c) => c.userId)), [clients]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    [i18n.language],
  );

  const mergeUsersIntoMap = useCallback((users: UserInfo[]) => {
    setUserMap((prev) => {
      const next = { ...prev };
      for (const u of users) {
        next[u.userId] = u;
      }
      return next;
    });
  }, []);

  const loadAll = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [fl, pend, sent] = await Promise.all([
        getFriendsList(),
        getPendingFriendRequests(),
        getSentFriendRequests(),
      ]);
      setFriendRows(fl.friends);
      setPendingRequests(pend.requests);
      setSentRequests(sent.requests);
      mergeUsersIntoMap([...fl.users, ...pend.users, ...sent.users]);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : t('REACT_FRIENDS_PAGE_LOAD_ERROR'));
    } finally {
      setLoading(false);
    }
  }, [mergeUsersIntoMap, t, user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!addModalOpen) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddModalOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addModalOpen]);

  const acceptedFriends = useMemo(
    () => friendRows.filter((f) => f.status === 'accepted' || f.status === 'blocked'),
    [friendRows],
  );

  const onRemove = useCallback(
    async (friendUserId: number) => {
      if (!window.confirm(t('REACT_FRIENDS_REMOVE_CONFIRM'))) {
        return;
      }
      try {
        await removeFriend(friendUserId);
        showSnackbar(t('REACT_FRIENDS_REMOVED_OK'));
        await loadAll();
      } catch (e) {
        showSnackbar(e instanceof ApiError ? e.message : t('REACT_FRIENDS_ACTION_FAILED'), { variant: 'error' });
      }
    },
    [loadAll, showSnackbar, t],
  );

  const onBlock = useCallback(
    async (targetUserId: number) => {
      if (!window.confirm(t('REACT_FRIENDS_BLOCK_CONFIRM'))) {
        return;
      }
      try {
        await blockFriendUser(targetUserId);
        showSnackbar(t('REACT_FRIENDS_BLOCKED_OK'));
        await loadAll();
      } catch (e) {
        showSnackbar(e instanceof ApiError ? e.message : t('REACT_FRIENDS_ACTION_FAILED'), { variant: 'error' });
      }
    },
    [loadAll, showSnackbar, t],
  );

  const onUnblock = useCallback(
    async (targetUserId: number) => {
      try {
        await unblockFriendUser(targetUserId);
        showSnackbar(t('REACT_FRIENDS_UNBLOCKED_OK'));
        await loadAll();
      } catch (e) {
        showSnackbar(e instanceof ApiError ? e.message : t('REACT_FRIENDS_ACTION_FAILED'), { variant: 'error' });
      }
    },
    [loadAll, showSnackbar, t],
  );

  const onAccept = useCallback(
    async (requestId: number) => {
      try {
        await acceptFriendRequest(requestId);
        showSnackbar(t('REACT_FRIENDS_ACCEPT_OK'));
        await loadAll();
      } catch (e) {
        showSnackbar(e instanceof ApiError ? e.message : t('REACT_FRIENDS_ACTION_FAILED'), { variant: 'error' });
      }
    },
    [loadAll, showSnackbar, t],
  );

  const onReject = useCallback(
    async (requestId: number) => {
      if (!window.confirm(t('REACT_FRIENDS_REJECT_CONFIRM'))) {
        return;
      }
      try {
        await rejectFriendRequest(requestId);
        showSnackbar(t('REACT_FRIENDS_REJECT_OK'));
        await loadAll();
      } catch (e) {
        showSnackbar(e instanceof ApiError ? e.message : t('REACT_FRIENDS_ACTION_FAILED'), { variant: 'error' });
      }
    },
    [loadAll, showSnackbar, t],
  );

  const onCancelSent = useCallback(
    async (requestId: number) => {
      if (!window.confirm(t('REACT_FRIENDS_CANCEL_CONFIRM'))) {
        return;
      }
      try {
        await cancelFriendRequest(requestId);
        showSnackbar(t('REACT_FRIENDS_CANCEL_OK'));
        await loadAll();
      } catch (e) {
        showSnackbar(e instanceof ApiError ? e.message : t('REACT_FRIENDS_ACTION_FAILED'), { variant: 'error' });
      }
    },
    [loadAll, showSnackbar, t],
  );

  const submitAddFriend = useCallback(async () => {
    setAddFieldError(null);
    const trimmed = receiverIdRaw.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      setAddFieldError(t('REACT_FRIENDS_ADD_ID_INVALID'));
      return;
    }
    const receiverId = parseInt(trimmed, 10);
    setAddSubmitting(true);
    try {
      await sendFriendRequest(receiverId);
      showSnackbar(t('REACT_FRIEND_REQUEST_SENT'));
      setReceiverIdRaw('');
      setAddModalOpen(false);
      await loadAll();
    } catch (e) {
      setAddFieldError(e instanceof ApiError ? e.message : t('REACT_FRIEND_REQUEST_FAILED'));
    } finally {
      setAddSubmitting(false);
    }
  }, [loadAll, receiverIdRaw, showSnackbar, t]);

  const myId = user?.userId ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.cornerTL} aria-hidden />
      <div className={styles.cornerBR} aria-hidden />
      <div className={styles.dots} aria-hidden />

      <div className={styles.scroll}>
        <div className={styles.dashboard}>
      <nav className={styles.navContainer} aria-label={t('MAIN_FRIENDS')}>
        <div className={styles.tabNav} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'friends'}
            className={`${styles.navTab} ${activeTab === 'friends' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('friends')}
            disabled={loading}
          >
            <TabFriendsIcon className={styles.tabIcon} />
            <span className={styles.tabContent}>
              <span className={styles.tabTitle}>{t('REACT_FRIENDS_TAB_FRIENDS')}</span>
              <span className={styles.tabBadge}>{acceptedFriends.length}</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            className={`${styles.navTab} ${activeTab === 'pending' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('pending')}
            disabled={loading}
          >
            <TabMailIcon className={styles.tabIcon} />
            <span className={styles.tabContent}>
              <span className={styles.tabTitle}>{t('REACT_FRIENDS_TAB_REQUESTS')}</span>
              <span
                className={`${styles.tabBadge} ${pendingRequests.length > 0 ? styles.tabBadgeHighlight : ''}`}
              >
                {pendingRequests.length}
              </span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sent'}
            className={`${styles.navTab} ${activeTab === 'sent' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('sent')}
            disabled={loading}
          >
            <TabSendIcon className={styles.tabIcon} />
            <span className={styles.tabContent}>
              <span className={styles.tabTitle}>{t('REACT_FRIENDS_TAB_SENT')}</span>
              <span className={styles.tabBadge}>{sentRequests.length}</span>
            </span>
          </button>
        </div>
      </nav>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>{t('REACT_FRIENDS_LOADING_NETWORK')}</div>
          </div>
        ) : (
          <>
            {loadError ? <div className={styles.errorBanner}>{loadError}</div> : null}

            <div className={styles.tabPanelsColumn}>
            {activeTab === 'friends' ? (
              <section className={styles.tabPanel} role="tabpanel">
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    <PanelPeopleIcon className={styles.panelIcon} />
                    {t('REACT_FRIENDS_PANEL_NETWORK_TITLE')}
                  </h2>
                  <button type="button" className={styles.addBtn} onClick={() => setAddModalOpen(true)}>
                    <svg className={styles.addBtnIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    <span className={styles.addBtnLabel}>{t('REACT_FRIENDS_ADD_FRIEND')}</span>
                  </button>
                </div>

                {acceptedFriends.length === 0 ? (
                  <div className={styles.emptyBattlefield}>
                    <div className={styles.emptyIconWrap}>
                      <PanelPeopleIcon className={styles.emptyIcon} />
                    </div>
                    <h3 className={styles.emptyTitle}>{t('REACT_FRIENDS_EMPTY_NETWORK_TITLE')}</h3>
                    <p className={styles.emptyDesc}>{t('REACT_FRIENDS_EMPTY_NETWORK_BODY')}</p>
                    <p className={styles.emptyHint}>{t('REACT_FRIENDS_EMPTY_NETWORK_HINT')}</p>
                  </div>
                ) : (
                  <div className={styles.roster}>
                    {acceptedFriends.map((f) => {
                      const other = otherInFriendship(f, myId);
                      const display = mergeUser(other.userId, userMap, usersById);
                      const isOnline = onlineIds.has(other.userId);
                      const src = resolveAvatarUrl(display.avatarFile, serverConfig);
                      const blocked = f.status === 'blocked';
                      return (
                        <div
                          key={f.id}
                          className={`${styles.trainerCard} ${isOnline && !blocked ? styles.trainerCardOnline : ''}`}
                        >
                          <div className={styles.statusCol}>
                            <div className={`${styles.statusDot} ${isOnline ? styles.statusDotOnline : ''}`} />
                          </div>
                          <div className={styles.avatarCol}>
                            <div className={styles.avatarFrame}>
                              {src ? (
                                <img className={styles.avatarImg} src={src} alt="" />
                              ) : (
                                <div className={styles.avatarImg} aria-hidden />
                              )}
                            </div>
                            <div
                              className={`${styles.badge} ${blocked ? styles.badgeDanger : styles.badgeSuccess}`}
                            >
                              {blocked ? t('REACT_FRIENDS_BADGE_BLOCKED') : t('REACT_FRIENDS_BADGE_FRIEND')}
                            </div>
                          </div>
                          <div className={styles.infoCol}>
                            <div className={styles.trainerName}>
                              {display.name}
                              {isOnline ? (
                                <svg width={8} height={8} viewBox="0 0 8 8" fill="currentColor" aria-hidden>
                                  <circle cx={4} cy={4} r={3} />
                                </svg>
                              ) : null}
                            </div>
                            <div className={styles.metaRow}>
                              <span>
                                {t('REACT_ONLINE_PLAYERS_RANK', {
                                  rank: display.ranking,
                                })}
                              </span>
                              <span
                                className={`${styles.connection} ${isOnline ? styles.connectionOn : ''}`}
                              >
                                {isOnline ? t('REACT_FRIENDS_ONLINE') : t('REACT_FRIENDS_OFFLINE')}
                              </span>
                            </div>
                          </div>
                          <div className={styles.actionsCol}>
                            {!blocked ? (
                              <>
                                <Link className={`${styles.actionLink} ${styles.actionPrimary}`} to={`/message/${other.userId}`}>
                                  {t('BUTTON_SEND_MESSAGE')}
                                </Link>
                                <Link className={styles.actionLink} to={`/profile/${other.userId}`}>
                                  {t('BUTTON_SHOW_PROFILE')}
                                </Link>
                                <button type="button" className={styles.actionLink} onClick={() => void onRemove(other.userId)}>
                                  {t('REACT_FRIENDS_REMOVE')}
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.actionLink} ${styles.actionDanger}`}
                                  onClick={() => void onBlock(other.userId)}
                                >
                                  {t('REACT_FRIENDS_BLOCK')}
                                </button>
                              </>
                            ) : (
                              <button type="button" className={`${styles.actionLink} ${styles.actionWarn}`} onClick={() => void onUnblock(other.userId)}>
                                {t('REACT_FRIENDS_UNBLOCK')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'pending' ? (
              <section className={styles.tabPanel} role="tabpanel">
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    <TabMailIcon className={styles.panelIcon} />
                    {t('REACT_FRIENDS_PANEL_INCOMING_TITLE')}
                  </h2>
                  <div className={styles.requestCounter}>
                    <span className={styles.counterValue}>{pendingRequests.length}</span>
                    <span className={styles.counterLabel}>{t('REACT_FRIENDS_COUNTER_PENDING')}</span>
                  </div>
                </div>
                {pendingRequests.length === 0 ? (
                  <div className={styles.emptyBattlefield}>
                    <div className={styles.emptyIconWrap}>
                      <TabMailIcon className={styles.emptyIcon} />
                    </div>
                    <h3 className={styles.emptyTitle}>{t('REACT_FRIENDS_EMPTY_PENDING_TITLE')}</h3>
                    <p className={styles.emptyDesc}>{t('REACT_FRIENDS_EMPTY_PENDING_DESC')}</p>
                  </div>
                ) : (
                  <div className={styles.requestRoster}>
                    {pendingRequests.map((req) => {
                      const peer = req.sender;
                      const display = mergeUser(peer.userId, userMap, usersById);
                      const src = resolveAvatarUrl(display.avatarFile, serverConfig);
                      const isOnline = onlineIds.has(peer.userId);
                      return (
                        <div key={req.id} className={styles.requestCard}>
                          <div className={styles.requestProfile}>
                            <div className={styles.avatarCol}>
                              <div className={styles.avatarFrame}>
                                {src ? (
                                  <img className={styles.avatarImg} src={src} alt="" />
                                ) : (
                                  <div className={styles.avatarImg} aria-hidden />
                                )}
                              </div>
                            </div>
                            <div className={styles.requestDetails}>
                              <div className={styles.trainerName}>{display.name}</div>
                              <div className={styles.metaRow}>
                                <span>{t('REACT_ONLINE_PLAYERS_RANK', { rank: display.ranking })}</span>
                                <span className={`${styles.connection} ${isOnline ? styles.connectionOn : ''}`}>
                                  {isOnline ? t('REACT_FRIENDS_ONLINE') : t('REACT_FRIENDS_OFFLINE')}
                                </span>
                              </div>
                              <div className={styles.requestMeta}>
                                <span>{dateFmt.format(new Date(req.created_at))}</span>
                                <span className={styles.typeLabel}>{t('REACT_FRIENDS_REQUEST_INCOMING_LABEL')}</span>
                              </div>
                            </div>
                          </div>
                          {req.status === 'pending' ? (
                            <div className={styles.controls}>
                              <button type="button" className={styles.btnAccept} onClick={() => void onAccept(req.id)}>
                                {t('REACT_FRIENDS_ACCEPT')}
                              </button>
                              <button type="button" className={styles.btnReject} onClick={() => void onReject(req.id)}>
                                {t('REACT_FRIENDS_REJECT')}
                              </button>
                            </div>
                          ) : (
                            <span className={`${styles.statusPill} ${req.status === 'accepted' ? styles.statusPillOk : styles.statusPillNo}`}>
                              {req.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === 'sent' ? (
              <section className={styles.tabPanel} role="tabpanel">
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    <TabSendIcon className={styles.panelIcon} />
                    {t('REACT_FRIENDS_PANEL_OUTGOING_TITLE')}
                  </h2>
                  <div className={styles.requestCounter}>
                    <span className={styles.counterValue}>{sentRequests.length}</span>
                    <span className={styles.counterLabel}>{t('REACT_FRIENDS_COUNTER_SENT')}</span>
                  </div>
                </div>
                {sentRequests.length === 0 ? (
                  <div className={styles.emptyBattlefield}>
                    <div className={styles.emptyIconWrap}>
                      <TabSendIcon className={styles.emptyIcon} />
                    </div>
                    <h3 className={styles.emptyTitle}>{t('REACT_FRIENDS_EMPTY_SENT_TITLE')}</h3>
                    <p className={styles.emptyDesc}>{t('REACT_FRIENDS_EMPTY_SENT_DESC')}</p>
                  </div>
                ) : (
                  <div className={styles.requestRoster}>
                    {sentRequests.map((req) => {
                      const peer = req.receiver;
                      const display = mergeUser(peer.userId, userMap, usersById);
                      const src = resolveAvatarUrl(display.avatarFile, serverConfig);
                      const isOnline = onlineIds.has(peer.userId);
                      return (
                        <div key={req.id} className={styles.requestCard}>
                          <div className={styles.requestProfile}>
                            <div className={styles.avatarCol}>
                              <div className={styles.avatarFrame}>
                                {src ? (
                                  <img className={styles.avatarImg} src={src} alt="" />
                                ) : (
                                  <div className={styles.avatarImg} aria-hidden />
                                )}
                              </div>
                            </div>
                            <div className={styles.requestDetails}>
                              <div className={styles.trainerName}>{display.name}</div>
                              <div className={styles.metaRow}>
                                <span>{t('REACT_ONLINE_PLAYERS_RANK', { rank: display.ranking })}</span>
                                <span className={`${styles.connection} ${isOnline ? styles.connectionOn : ''}`}>
                                  {isOnline ? t('REACT_FRIENDS_ONLINE') : t('REACT_FRIENDS_OFFLINE')}
                                </span>
                              </div>
                              <div className={styles.requestMeta}>
                                <span>{dateFmt.format(new Date(req.created_at))}</span>
                                <span className={styles.typeLabel}>{t('REACT_FRIENDS_REQUEST_OUTGOING_LABEL')}</span>
                              </div>
                            </div>
                          </div>
                          {req.status === 'pending' ? (
                            <div className={styles.controls}>
                              <button type="button" className={styles.btnCancel} onClick={() => void onCancelSent(req.id)}>
                                {t('REACT_FRIENDS_CANCEL_REQUEST_BTN')}
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`${styles.statusPill} ${req.status === 'accepted' ? styles.statusPillOk : styles.statusPillNo}`}
                            >
                              {req.status === 'accepted'
                                ? t('REACT_FRIENDS_STATUS_ACCEPTED')
                                : req.status === 'rejected'
                                  ? t('REACT_FRIENDS_STATUS_REJECTED')
                                  : req.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}
            </div>
          </>
        )}
      </div>

      {addModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => setAddModalOpen(false)}
        >
          <Modal
            className={styles.modalBox}
            aria-labelledby="friends-add-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="friends-add-modal-title" className={styles.modalTitle}>
                {t('REACT_FRIENDS_MODAL_TITLE')}
              </h3>
              <button type="button" className={styles.modalClose} aria-label={t('REACT_FRIENDS_MODAL_CLOSE')} onClick={() => setAddModalOpen(false)}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.formLabel} htmlFor="friends-receiver-id">
                {t('REACT_FRIENDS_USER_ID_LABEL')}
              </label>
              <input
                id="friends-receiver-id"
                className={styles.formInput}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('REACT_FRIENDS_USER_ID_PLACEHOLDER')}
                value={receiverIdRaw}
                onChange={(e) => {
                  setReceiverIdRaw(e.target.value);
                  setAddFieldError(null);
                }}
              />
              {addFieldError ? <p className={styles.formError}>{addFieldError}</p> : null}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setAddModalOpen(false)}>
                  {t('BUTTON_CANCEL')}
                </button>
                <button type="button" className={styles.btnAccept} disabled={addSubmitting} onClick={() => void submitAddFriend()}>
                  {addSubmitting ? t('REACT_FRIENDS_SENDING') : t('REACT_FRIENDS_SEND_REQUEST')}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}
