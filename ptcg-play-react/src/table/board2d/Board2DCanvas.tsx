import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card, CardList, Player } from 'ptcg-server';
import { useCardImageMaps, useDeckCardScanUrl } from '../../context/CardImagesContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import type { LocalGameState } from '../types/localGameState';
import { BoardInteractionService } from '../BoardInteractionService';
import type { Board3dGameActions } from '../board3d/board3dGameActions';
import { createBoard3dCardsAdapter } from '../board3d/createBoard3dCardsAdapter';
import type { Board3dCardsAdapter } from '../board3d/board3dCardsAdapter';
import type { Board3dCardInfoData, CardInfoPaneActionResult } from '../board3d/board3dCardsAdapter';
import { refreshInPlayCardInfoData } from '../board3d/refreshInPlayCardInfoData';
import { CardInfoPopup } from '../../card-info/CardInfoPopup';
import { CardInfoListPopup } from '../../card-info/CardInfoListPopup';
import { appConfig } from '../../env/config';
import { Board2D } from './Board2D';
import styles from './Board2DCanvas.module.css';

const EMPTY_CATALOG: Card[] = [];

export type Board2DCanvasProps = {
  gameState: LocalGameState;
  topPlayer: Player;
  bottomPlayer: Player;
  bottomPlayerHand: CardList;
  topPlayerHand: CardList;
  clientId: number;
  catalog: Card[];
  adminSpectatorReveal?: { hands?: boolean; prizes?: boolean };
  boardInteraction: BoardInteractionService;
  gameActions: Board3dGameActions;
  onKoSequenceActiveChange?: (active: boolean) => void;
  onBoardFps?: (fps: number) => void;
};

type CardPromptState =
  | null
  | {
      kind: 'info';
      data: Board3dCardInfoData;
      resolve: (v: CardInfoPaneActionResult) => void;
    }
  | {
      kind: 'list';
      data: Board3dCardInfoData;
      resolve: (v: CardInfoPaneActionResult) => void;
    };

function useStableGameActions(actions: Board3dGameActions): Board3dGameActions {
  const ref = useRef(actions);
  ref.current = actions;
  return useMemo(
    () => ({
      playCardAction: (...a) => ref.current.playCardAction(...a),
      retreatAction: (...a) => ref.current.retreatAction(...a),
      trainerAbility: (...a) => ref.current.trainerAbility(...a),
      energyAbility: (...a) => ref.current.energyAbility(...a),
      ability: (...a) => ref.current.ability(...a),
      stadium: (...a) => ref.current.stadium(...a),
      attack: (...a) => ref.current.attack(...a),
      retreatStart: (...a) => ref.current.retreatStart(...a),
      resolvePrompt: (...a) => ref.current.resolvePrompt(...a),
    }),
    [],
  );
}

export function Board2DCanvas(props: Board2DCanvasProps) {
  const [cardPrompt, setCardPrompt] = useState<CardPromptState>(null);
  const maps = useCardImageMaps();
  const { serverConfig, cardsInfo } = useAuth();
  const settings = useSettings();
  const getScanUrl = useDeckCardScanUrl(serverConfig?.scansUrl);
  const gameActionsStable = useStableGameActions(props.gameActions);

  const catalog =
    props.catalog.length > 0 ? props.catalog : (cardsInfo?.cards ?? EMPTY_CATALOG);

  const queueInfo = useCallback((data: Board3dCardInfoData) => {
    return new Promise<CardInfoPaneActionResult>((resolve) => {
      setCardPrompt({ kind: 'info', data, resolve });
    });
  }, []);

  const queueList = useCallback((data: Board3dCardInfoData) => {
    return new Promise<CardInfoPaneActionResult>((resolve) => {
      setCardPrompt({ kind: 'list', data, resolve });
    });
  }, []);

  const cardsAdapter: Board3dCardsAdapter = useMemo(
    () =>
      createBoard3dCardsAdapter({
        maps,
        scansUrl: serverConfig?.scansUrl,
        apiBase: appConfig.apiUrl,
        sleevesUrl: serverConfig?.sleevesUrl,
        deckBoxesUrl: (serverConfig as { deckBoxesUrl?: string } | null)?.deckBoxesUrl,
        coinsUrl: (serverConfig as { coinsUrl?: string } | null)?.coinsUrl,
        showCardInfo: queueInfo,
        showCardInfoList: queueList,
      }),
    [maps, serverConfig?.scansUrl, serverConfig?.sleevesUrl, serverConfig, queueInfo, queueList],
  );

  // Keep open card info in sync with board state (e.g. Fossil Ditto Transform).
  useEffect(() => {
    const players = [props.topPlayer, props.bottomPlayer];
    setCardPrompt((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, data: refreshInPlayCardInfoData(prev.data, players) };
    });
  }, [props.gameState, props.topPlayer, props.bottomPlayer]);

  // No KO flight on 2D — keep prize prompts unblocked.
  useEffect(() => {
    props.onKoSequenceActiveChange?.(false);
  }, [props.onKoSequenceActiveChange]);

  const cardScale = (settings.cardSize || 100) / 100;

  return (
    <div className={styles.root}>
      <Board2D
        gameState={props.gameState}
        topPlayer={props.topPlayer}
        bottomPlayer={props.bottomPlayer}
        bottomPlayerHand={props.bottomPlayerHand}
        topPlayerHand={props.topPlayerHand}
        clientId={props.clientId}
        boardInteraction={props.boardInteraction}
        gameActions={gameActionsStable}
        cardsAdapter={cardsAdapter}
        cardScale={cardScale}
        perspectiveEnabled={settings.board2dPerspectiveEnabled}
        adminSpectatorReveal={props.adminSpectatorReveal}
      />

      {cardPrompt?.kind === 'info' && cardPrompt.data.card ? (
        <CardInfoPopup
          card={cardPrompt.data.card}
          cardList={cardPrompt.data.cardList}
          players={cardPrompt.data.players}
          facedown={cardPrompt.data.facedown}
          catalog={catalog}
          getScanUrl={getScanUrl}
          showTags={settings.showTags}
          cardTextKerning={settings.cardTextKerning}
          onClose={() => {
            cardPrompt.resolve(undefined);
            setCardPrompt(null);
          }}
          isInGame
          options={cardPrompt.data.options}
          onTableAction={(action) => {
            cardPrompt.resolve(action);
            setCardPrompt(null);
          }}
        />
      ) : null}

      {cardPrompt?.kind === 'list' && cardPrompt.data.cardList ? (
        <CardInfoListPopup
          cardList={cardPrompt.data.cardList}
          players={cardPrompt.data.players}
          catalog={catalog}
          getScanUrl={getScanUrl}
          facedown={cardPrompt.data.facedown}
          allowReveal={cardPrompt.data.allowReveal}
          options={cardPrompt.data.options}
          showTags={settings.showTags}
          cardTextKerning={settings.cardTextKerning}
          isInGame
          onClose={() => {
            cardPrompt.resolve(undefined);
            setCardPrompt(null);
          }}
          onResolve={(action) => {
            cardPrompt.resolve(action);
            setCardPrompt(null);
          }}
        />
      ) : null}
    </div>
  );
}
