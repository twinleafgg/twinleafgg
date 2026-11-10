import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { Card } from 'ptcg-server';
import { createDeck, saveDeck } from '../api/deckApi';
import { ApiError } from '../api/apiError';
import { useAuth } from '../context/AuthContext';
import { useDeckCardScanUrl } from '../context/CardImagesContext';
import { CardFace } from '../components/cards';
import { FormAlert } from '../components/ui/FormAlert';
import { ShellButton } from '../components/ui/ShellButton';
import { ShellButtonLink } from '../components/ui/ShellButtonLink';
import { TextField } from '../components/ui/TextField';
import { deckListExportText } from '../deck-editor/deckListExportText';
import { checkDraftCanStart, draftCardsRequired, draftPicksPerPlayer } from './draftEngine';
import { slotsFromCubeCards } from './cubeRules';
import { getCube } from './cubeStorage';
import { useCubeDraft } from './useCubeDraft';
import {
  CUBE_MAX_PLAYERS,
  CUBE_MIN_PLAYERS,
  CUBE_PACK_SIZE,
  CUBE_PACKS_PER_PLAYER,
  type CubeDraftRoom,
  type CubeDraftSeat,
} from './types';
import styles from './CubeDraftRoomPage.module.css';

function phaseKey(phase: CubeDraftRoom['phase']): string {
  if (phase === 'lobby') {
    return 'CUBE_PHASE_LOBBY';
  }
  if (phase === 'drafting') {
    return 'CUBE_PHASE_DRAFTING';
  }
  return 'CUBE_PHASE_COMPLETE';
}

function DraftPackCard({
  fullName,
  card,
  src,
  disabled,
  onClick,
}: {
  fullName: string;
  card: Card | null;
  src: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.packCard}
      onClick={onClick}
      disabled={disabled}
      title={card?.name ?? fullName}
      data-testid="pack-card"
    >
      <CardFace
        card={card}
        src={src}
        name={card?.name ?? fullName}
        loading="lazy"
        style={{ width: '100%' }}
      />
    </button>
  );
}

function SeatRow({
  seat,
  hostId,
  isYou,
  picked,
  totalPicks,
  showStatus,
}: {
  seat: CubeDraftSeat;
  hostId: string;
  isYou: boolean;
  picked: boolean;
  totalPicks: number;
  showStatus: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.seatRow}>
      <span className={seat.connected ? styles.dotOn : styles.dotOff} aria-hidden />
      <div className={styles.seatIdentity}>
        <span className={styles.seatName}>
          {seat.name}
          {isYou ? <span className={styles.youTag}>{t('DRAFT_YOU')}</span> : null}
        </span>
        {seat.clientId === hostId ? <span className={styles.hostTag}>{t('DRAFT_HOST')}</span> : null}
      </div>
      <span className={styles.seatCount}>
        {t('DRAFT_PICK_COUNT', { count: seat.picks.length, total: totalPicks })}
      </span>
      {showStatus ? (
        <span className={picked ? styles.statusWaiting : styles.statusPicking}>
          {picked ? t('DRAFT_STATUS_WAITING') : t('DRAFT_STATUS_PICKING')}
        </span>
      ) : null}
    </div>
  );
}

export function CubeDraftRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomCode = '' } = useParams();
  const { cardsInfo, serverConfig } = useAuth();
  const controller = useCubeDraft(roomCode);
  const { room, clientId, isHost, missing, notice, pendingPick } = controller;

  const [deckName, setDeckName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [poolCopied, setPoolCopied] = useState(false);

  const allCards = useMemo(() => cardsInfo?.cards ?? [], [cardsInfo?.cards]);
  const byFullName = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of allCards) {
      map.set(card.fullName, card);
    }
    return map;
  }, [allCards]);
  const getScanUrl = useDeckCardScanUrl(serverConfig?.scansUrl);

  useEffect(() => {
    if (room && !deckName) {
      setDeckName(`${room.cubeName} Draft`.slice(0, 32));
    }
  }, [deckName, room]);

  const me = useMemo(
    () => room?.seats.find((seat) => seat.clientId === clientId) ?? null,
    [clientId, room],
  );

  const cubeCardCount = useMemo(() => {
    if (!room) {
      return 0;
    }
    return getCube(room.cubeId)?.cards.length ?? room.cardCount;
  }, [room]);

  const totalPicks = draftPicksPerPlayer();

  const onCopyInvite = useCallback(() => {
    if (!room) {
      return;
    }
    const url = `${window.location.origin}/draft/${room.id}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setInviteCopied(true);
        window.setTimeout(() => setInviteCopied(false), 1800);
      })
      .catch(() => {
        /* clipboard may be blocked */
      });
  }, [room]);

  const startingCards = room?.startingCards ?? [];
  const poolCards = useMemo(() => {
    if (!me) {
      return [];
    }
    return [...startingCards, ...me.picks];
  }, [me, startingCards]);

  const onCopyPool = useCallback(() => {
    if (!me) {
      return;
    }
    void navigator.clipboard
      .writeText(deckListExportText(poolCards))
      .then(() => {
        setPoolCopied(true);
        window.setTimeout(() => setPoolCopied(false), 1800);
      })
      .catch(() => setSaveError(t('ERROR_CLIPBOARD_ACCESS')));
  }, [me, poolCards, t]);

  const onSaveDeck = useCallback(async () => {
    if (!me || !room) {
      return;
    }
    const name = deckName.trim();
    if (name.length < 3 || name.length > 32) {
      setSaveError(t('DRAFT_SAVE_NAME_RULES'));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createDeck(name);
      await saveDeck(created.deck.id, name, poolCards);
      navigate(`/deck/${created.deck.id}`);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : t('DRAFT_SAVE_ERROR'));
    } finally {
      setSaving(false);
    }
  }, [deckName, me, navigate, poolCards, room, t]);

  const onLeave = useCallback(() => {
    controller.leave();
    navigate('/cube');
  }, [controller, navigate]);

  if (missing) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredPanel}>
          <h1 className={styles.title}>{t('DRAFT_MISSING')}</h1>
          <p className={styles.muted}>{t('DRAFT_MISSING_HINT')}</p>
          {notice ? <FormAlert>{notice}</FormAlert> : null}
          <ShellButtonLink to="/cube" variant="ghost">
            {t('CUBE_BACK_TO_CUBES')}
          </ShellButtonLink>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredPanel}>
          <p className={styles.muted}>{t('DRAFT_LOADING')}</p>
        </div>
      </div>
    );
  }

  const startBlock =
    checkDraftCanStart(room, cubeCardCount) === null
      ? null
      : room.seats.length < CUBE_MIN_PLAYERS
        ? t('DRAFT_NEED_PLAYERS', { count: CUBE_MIN_PLAYERS })
        : !room.seats.every((seat) => seat.ready)
          ? t('DRAFT_NEED_READY')
          : cubeCardCount < draftCardsRequired(room.seats.length)
            ? t('DRAFT_NEEDS_CARDS', {
                needed: draftCardsRequired(room.seats.length),
                players: room.seats.length,
                count: cubeCardCount,
              })
            : null;

  const myPack = me ? room.packsBySeat[me.clientId] ?? [] : [];
  const myPickLocked = me ? room.pickedThisPass[me.clientId] === true : true;
  const canPick = !!me && room.phase === 'drafting' && !myPickLocked && !pendingPick;
  const recentPicks = room.log.slice(-10).slice().reverse();
  const mySlots = me ? slotsFromCubeCards(me.picks, byFullName).slots : [];
  const starterSlots = slotsFromCubeCards(startingCards, byFullName).slots;
  const mutantEvolution = room.mutantEvolution === true;

  const startersBlock =
    starterSlots.length > 0 ? (
      <div className={styles.startersBlock}>
        <div className={styles.panelHeader}>
          <h3 className={styles.subTitle}>{t('CUBE_STARTERS_SECTION')}</h3>
          <span className={styles.panelMeta}>{t('DRAFT_TOTAL_CARDS', { count: startingCards.length })}</span>
        </div>
        <p className={styles.panelHint}>{t('CUBE_STARTERS_HINT')}</p>
        <div className={styles.miniGrid}>
          {starterSlots.map((slot) => (
            <div key={`starter-${slot.card.fullName}`} className={styles.miniCard} title={`${slot.card.name} ×${slot.count}`}>
              <CardFace
                card={slot.card}
                src={getScanUrl(slot.card)}
                name={slot.card.name}
                loading="lazy"
                style={{ width: '100%' }}
              />
              {slot.count > 1 ? <span className={styles.countBadge}>×{slot.count}</span> : null}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className={styles.page}>
      <header className={styles.roomHeader}>
        <div className={styles.roomIdentity}>
          <ShellButtonLink to="/cube" variant="ghost" className={styles.backLink}>
            {t('CUBE_BACK_TO_CUBES')}
          </ShellButtonLink>
          <div>
            <h1 className={styles.title}>{room.cubeName}</h1>
            <div className={styles.roomMeta}>
              {t('CUBE_TITLE')} · {t(phaseKey(room.phase))}
              {room.phase === 'drafting'
                ? ` · ${t('DRAFT_ROUND', { round: room.round, total: CUBE_PACKS_PER_PLAYER })}`
                : ''}
            </div>
          </div>
        </div>

        <div className={styles.headerAside}>
          <div className={styles.codePill}>
            <span className={styles.codeLabel}>{t('DRAFT_ROOM_CODE')}</span>
            <strong className={styles.code}>{room.id}</strong>
            <button type="button" className={styles.linkBtn} onClick={onCopyInvite}>
              {inviteCopied ? t('DRAFT_INVITE_COPIED') : t('DRAFT_COPY_INVITE')}
            </button>
          </div>
          <ShellButton variant="ghost" onClick={onLeave}>
            {t('DRAFT_LEAVE')}
          </ShellButton>
        </div>
      </header>

      {notice ? (
        <div className={styles.noticeBar}>
          <FormAlert>{notice}</FormAlert>
        </div>
      ) : null}

      {room.phase === 'lobby' ? (
        <div className={styles.lobbyGrid}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{t('DRAFT_LOBBY_TITLE')}</h2>
              <span className={styles.panelMeta}>
                {t('DRAFT_PLAYERS', { count: room.seats.length, max: CUBE_MAX_PLAYERS })}
              </span>
            </div>
            <p className={styles.panelHint}>{t('CUBE_LOCAL_NOTE')}</p>

            <div className={styles.seatCards}>
              {room.seats.map((seat) => (
                <div key={seat.clientId} className={styles.seatCard}>
                  <div className={styles.seatCardTop}>
                    <span className={seat.connected ? styles.dotOn : styles.dotOff} aria-hidden />
                    <span className={styles.seatName}>
                      {seat.name}
                      {seat.clientId === clientId ? (
                        <span className={styles.youTag}>{t('DRAFT_YOU')}</span>
                      ) : null}
                    </span>
                    {seat.clientId === room.hostId ? (
                      <span className={styles.hostTag}>{t('DRAFT_HOST')}</span>
                    ) : null}
                  </div>
                  <span className={seat.ready ? styles.readyTag : styles.notReadyTag}>
                    {seat.ready ? t('DRAFT_READY_LABEL') : t('DRAFT_NOT_READY_LABEL')}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.lobbyActions}>
              {me ? (
                <ShellButton
                  variant={me.ready ? 'ghost' : 'primary'}
                  onClick={() => controller.setReady(!me.ready)}
                >
                  {me.ready ? t('DRAFT_READY_CANCEL') : t('DRAFT_READY_ACTION')}
                </ShellButton>
              ) : null}
              {isHost ? (
                <ShellButton
                  variant="primary"
                  disabled={startBlock !== null}
                  onClick={controller.startDraft}
                >
                  {t('DRAFT_START')}
                </ShellButton>
              ) : (
                <span className={styles.waitingText}>{t('DRAFT_WAITING_HOST')}</span>
              )}
            </div>
            {startBlock ? <div className={styles.startHint}>{startBlock}</div> : null}
            {!me ? <p className={styles.muted}>{t('DRAFT_SPECTATOR')}</p> : null}
          </section>

          <aside className={styles.panel}>
            <h2 className={styles.panelTitle}>{t('CUBE_TITLE')}</h2>
            <dl className={styles.summaryList}>
              <div>
                <dt>{t('CUBE_TARGET_LABEL')}</dt>
                <dd>{t('CUBE_TARGET_VALUE', { count: cubeCardCount })}</dd>
              </div>
              <div>
                <dt>{t('CUBE_DRAFT_PLAYERS', { count: room.seats.length })}</dt>
                <dd>
                  {CUBE_PACKS_PER_PLAYER} × {CUBE_PACK_SIZE}
                </dd>
              </div>
              <div>
                <dt>{t('DRAFT_YOUR_PICKS')}</dt>
                <dd>{t('DRAFT_TOTAL_CARDS', { count: totalPicks })}</dd>
              </div>
              {mutantEvolution ? (
                <div>
                  <dt>{t('CUBE_MUTANT_EVOLUTION')}</dt>
                  <dd>{t('CUBE_MUTANT_EVOLUTION_HINT')}</dd>
                </div>
              ) : null}
            </dl>
            {startersBlock}
            <p className={styles.panelHint}>{t('DRAFT_REJOIN_HINT')}</p>
          </aside>
        </div>
      ) : null}

      {room.phase === 'drafting' ? (
        <div className={styles.draftLayout}>
          <section className={styles.packPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{t('DRAFT_YOUR_PACK')}</h2>
              <span className={styles.panelMeta}>
                {me
                  ? t('DRAFT_PICK', {
                      pick: Math.min(totalPicks, me.picks.length + 1),
                      total: totalPicks,
                    })
                  : null}
              </span>
            </div>

            {!me ? (
              <p className={styles.panelHint}>{t('DRAFT_SPECTATOR')}</p>
            ) : myPack.length === 0 ? (
              <p className={styles.panelHint}>{t('DRAFT_PACK_EMPTY')}</p>
            ) : (
              <>
                <p className={styles.pickHint}>
                  {myPickLocked
                    ? t('DRAFT_WAITING')
                    : pendingPick
                      ? t('DRAFT_PICK_PENDING')
                      : t('DRAFT_PICK_HINT')}
                </p>
                <div className={`${styles.packGrid} ${!canPick ? styles.packGridLocked : ''}`}>
                  {myPack.map((fullName, index) => {
                    const card = byFullName.get(fullName) ?? null;
                    return (
                      <DraftPackCard
                        key={`${fullName}-${index}`}
                        fullName={fullName}
                        card={card}
                        src={card ? getScanUrl(card) : ''}
                        disabled={!canPick}
                        onClick={() => controller.pickCard(fullName)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {startersBlock}

            <div className={styles.picksTray}>
              <div className={styles.panelHeader}>
                <h3 className={styles.subTitle}>{t('DRAFT_YOUR_PICKS')}</h3>
                <span className={styles.panelMeta}>
                  {t('DRAFT_PICK_COUNT', { count: me?.picks.length ?? 0, total: totalPicks })}
                </span>
              </div>
              {me && me.picks.length > 0 ? (
                <div className={styles.miniGrid}>
                  {me.picks.map((fullName, index) => {
                    const card = byFullName.get(fullName) ?? null;
                    return (
                      <div key={`${fullName}-${index}`} className={styles.miniCard}>
                        <CardFace
                          card={card}
                          src={card ? getScanUrl(card) : ''}
                          name={card?.name ?? fullName}
                          loading="lazy"
                          style={{ width: '100%' }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.muted}>{t('DRAFT_NO_PICKS')}</p>
              )}
            </div>
          </section>

          <aside className={styles.side}>
            <section className={styles.sidePanel}>
              <h3 className={styles.subTitle}>{t('DRAFT_PLAYERS', {
                count: room.seats.length,
                max: CUBE_MAX_PLAYERS,
              })}</h3>
              <div className={styles.seatList}>
                {room.seats.map((seat) => (
                  <SeatRow
                    key={seat.clientId}
                    seat={seat}
                    hostId={room.hostId}
                    isYou={seat.clientId === clientId}
                    picked={room.pickedThisPass[seat.clientId] === true}
                    totalPicks={totalPicks}
                    showStatus
                  />
                ))}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <h3 className={styles.subTitle}>{t('DRAFT_RECENT_PICKS')}</h3>
              {recentPicks.length === 0 ? (
                <p className={styles.muted}>{t('DRAFT_NO_PICKS')}</p>
              ) : (
                <ul className={styles.pickLog}>
                  {recentPicks.map((entry, index) => (
                    <li key={`${entry.clientId}-${entry.round}-${entry.pick}-${index}`}>
                      <span className={styles.logPick}>
                        R{entry.round}P{entry.pick}
                      </span>
                      <span className={styles.logPlayer}>{entry.playerName}</span>
                      <span className={styles.logCard}>
                        {byFullName.get(entry.cardFullName)?.name ?? entry.cardFullName}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      ) : null}

      {room.phase === 'complete' ? (
        <div className={styles.completeLayout}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{t('DRAFT_COMPLETE')}</h2>
            <p className={styles.panelHint}>{t('DRAFT_COMPLETE_HINT')}</p>

            {me ? (
              <>
                <div className={styles.deckForm}>
                  <TextField
                    id="draft-deck-name"
                    label={t('DRAFT_DECK_NAME')}
                    value={deckName}
                    onChange={(event) => setDeckName(event.target.value)}
                    maxLength={32}
                    rootClassName={styles.deckNameField}
                  />
                  <ShellButton
                    variant="primary"
                    disabled={saving}
                    onClick={() => void onSaveDeck()}
                  >
                    {saving ? t('DRAFT_SAVING') : t('DRAFT_SAVE_DECK')}
                  </ShellButton>
                  <ShellButton variant="ghost" onClick={onCopyPool}>
                    {poolCopied ? t('DRAFT_POOL_COPIED') : t('DRAFT_COPY_POOL')}
                  </ShellButton>
                </div>
                {saveError ? <FormAlert>{saveError}</FormAlert> : null}
                <p className={styles.panelHint}>{t('DRAFT_DECK_NOTE')}</p>
              </>
            ) : (
              <p className={styles.muted}>{t('DRAFT_SPECTATOR')}</p>
            )}

            <div className={styles.seatList}>
              {room.seats.map((seat) => (
                <SeatRow
                  key={seat.clientId}
                  seat={seat}
                  hostId={room.hostId}
                  isYou={seat.clientId === clientId}
                  picked={false}
                  totalPicks={totalPicks}
                  showStatus={false}
                />
              ))}
            </div>
          </section>

          {me ? (
            <section className={styles.panel}>
              {startersBlock}
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{t('DRAFT_YOUR_PICKS')}</h2>
                <span className={styles.panelMeta}>
                  {t('DRAFT_PICK_COUNT', { count: me.picks.length, total: totalPicks })}
                </span>
              </div>
              <div className={styles.poolGrid}>
                {mySlots.map((slot) => (
                  <div key={slot.card.fullName} className={styles.poolCard}>
                    <CardFace
                      card={slot.card}
                      src={getScanUrl(slot.card)}
                      name={slot.card.name}
                      loading="lazy"
                      style={{ width: '100%' }}
                    />
                    {slot.count > 1 ? <span className={styles.countBadge}>×{slot.count}</span> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
