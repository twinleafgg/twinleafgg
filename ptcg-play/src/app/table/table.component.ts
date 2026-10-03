import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Player, GamePhase, Format, selfPlayFocusPlayerId, State } from 'ptcg-server';
import {
  isSelfPlayBackgroundWait,
  promptRequiresSelfPlayFocus,
  selfPlayBackgroundWaitDelayMs,
} from './self-play-background-waits';
import { Observable, from, EMPTY } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { withLatestFrom, switchMap, finalize, tap, map } from 'rxjs/operators';
import { ApiError } from '../api/api.error';
import { AlertService } from '../shared/alert/alert.service';
import { DeckService } from '../api/services/deck.service';
import { GameService } from '../api/services/game.service';
import { LocalGameState } from '../shared/session/session.interface';
import { SessionService } from '../shared/session/session.service';
import { CardsBaseService } from '../shared/cards/cards-base.service';
import { BoardInteractionService } from '../shared/services/board-interaction.service';
import { GameOverPrompt } from './prompt/prompt-game-over/game-over.prompt';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { BattlePassService } from '../battle-pass/battle-pass.service';
import { XpGainData } from '../battle-pass/battle-pass.model';

@UntilDestroy()
@Component({
  selector: 'ptcg-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit, OnDestroy {

  public gameState: LocalGameState;
  public gameStates$: Observable<LocalGameState[]>;
  public clientId$: Observable<number>;
  public bottomPlayer: Player;
  public topPlayer: Player;
  public clientId: number;
  public loading: boolean;
  public waiting: boolean;
  public isAdmin: boolean;
  public isTO: boolean;
  private gameId: number;
  public showGameOver = false;
  public showMatchResultsSplash = false;
  public showXpGainScreen = false;
  public xpGainData: XpGainData | null = null;
  public gameOverPrompt: GameOverPrompt;
  public showSandboxPanel = false;
  public sandboxSidebarCollapsed: boolean = false;
  private backgroundWaitTimers = new Map<number, ReturnType<typeof setTimeout>>();

  public formats = {
    [Format.STANDARD]: 'LABEL_STANDARD',
    [Format.STANDARD_NIGHTLY]: 'LABEL_STANDARD_NIGHTLY',
    [Format.GLC]: 'LABEL_GLC',
    [Format.UNLIMITED]: 'LABEL_UNLIMITED',
    [Format.ETERNAL]: 'LABEL_ETERNAL',
    [Format.EXPANDED]: 'LABEL_EXPANDED',
    [Format.SWSH]: 'LABEL_SWSH',
    [Format.SM]: 'LABEL_SM',
    [Format.XY]: 'LABEL_XY',
    [Format.BW]: 'LABEL_BW',
    [Format.RSPK]: 'LABEL_RSPK',
    [Format.RETRO]: 'LABEL_RETRO',
    [Format.THEME]: 'LABEL_THEME',
  };

  constructor(
    private alertService: AlertService,
    private gameService: GameService,
    private deckService: DeckService,
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private translate: TranslateService,
    private cardsBaseService: CardsBaseService,
    private boardInteractionService: BoardInteractionService,
    private snackBar: MatSnackBar,
    private battlePassService: BattlePassService
  ) {
    this.gameStates$ = this.sessionService.get(session => session.gameStates);
    this.clientId$ = this.sessionService.get(session => session.clientId);
    this.sessionService.get(session => {
      const loggedUserId = session.loggedUserId;
      const loggedUser = loggedUserId && session.users[loggedUserId];
      return loggedUser && loggedUser.roleId === 4;
    }).subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
    this.sessionService.get(session => {
      const loggedUserId = session.loggedUserId;
      const loggedUser = loggedUserId && session.users[loggedUserId];
      return loggedUser && loggedUser.roleId === 5;
    }).subscribe(isTO => {
      this.isTO = isTO;
    });
  }

  ngOnInit() {
    // Ensure any active board selection is cleared when table initializes
    this.boardInteractionService.endBoardSelection();

    this.route.paramMap
      .pipe(
        withLatestFrom(this.gameStates$, this.clientId$),
        untilDestroyed(this)
      )
      .subscribe(([paramMap, gameStates, clientId]) => {
        this.gameId = parseInt(paramMap.get('gameId'), 10);
        this.gameState = gameStates.find(state => state.localId === this.gameId);
        // Check if sandbox mode is enabled
        if (this.gameState && this.gameState.state && this.gameState.state.gameSettings) {
          this.showSandboxPanel = this.isAdmin && this.gameState.state.gameSettings.sandboxMode === true;
        } else {
          this.showSandboxPanel = false;
        }

        // Note: We no longer set game ID here when viewing games
        // Game ID should only be set when actively joining as a player, not when spectating

        this.updatePlayers(this.gameState, clientId);
        this.syncSelfPlayBackgroundWaits(this.gameState);
      });

    this.gameStates$
      .pipe(
        untilDestroyed(this),
        withLatestFrom(this.clientId$)
      )
      .subscribe(([gameStates, clientId]) => {
        this.gameState = gameStates.find(state => state.localId === this.gameId);
        // Update sandbox panel visibility
        if (this.gameState && this.gameState.state && this.gameState.state.gameSettings) {
          this.showSandboxPanel = this.isAdmin && this.gameState.state.gameSettings.sandboxMode === true;
        } else {
          this.showSandboxPanel = false;
        }
        this.updatePlayers(this.gameState, clientId);
        this.syncSelfPlayBackgroundWaits(this.gameState);
      });
  }

  ngOnDestroy() {
    this.clearBackgroundWaitTimers();
    // Make sure selection state is cleared when leaving the table view
    this.boardInteractionService.endBoardSelection();

    // Clear game ID when navigating away from the table
    // This prevents reconnection attempts when user is no longer viewing the game
    if (this.gameState && this.gameState.gameId) {
      this.gameService.socketService.clearGameId();
    }
  }

  public play() {
    this.loading = true;
    this.deckService.getListByFormat(this.gameState.format)
      .pipe(
        finalize(() => { this.loading = false; }),
        untilDestroyed(this),
        switchMap(decks => {
          const options = decks
            .filter(deckEntry => deckEntry.isValid)
            .map(deckEntry => ({ value: deckEntry.id, viewValue: deckEntry.name }));

          if (options.length === 0) {
            this.alertService.alert(
              this.translate.instant('GAMES_NEED_DECK'),
              this.translate.instant('GAMES_NEED_DECK_TITLE')
            );
            return EMPTY;
          }

          return from(this.alertService.select({
            title: this.translate.instant('GAMES_YOUR_DECK_TITLE'),
            message: `${this.translate.instant('GAMES_FORMAT')}: ${this.translate.instant(this.formats[this.gameState.format])}`,
            placeholder: this.translate.instant('GAMES_YOUR_DECK'),
            options,
            value: options[0].value
          }));
        }),
        switchMap(deckId => {
          return deckId !== undefined
            ? this.deckService.getDeck(deckId)
            : EMPTY;
        })
      )
      .subscribe({
        next: deckResponse => {
          const deck = deckResponse.deck.cards;
          this.gameService.play(this.gameState.gameId, deck);
        },
        error: (error: ApiError) => { }
      });
  }

  private syncSelfPlayBackgroundWaits(gameState: LocalGameState | undefined) {
    if (
      !gameState?.state
      || gameState.replay
      || gameState.state.gameSettings?.selfPlay !== true
    ) {
      this.clearBackgroundWaitTimers();
      return;
    }

    const pending = gameState.state.prompts.filter(prompt =>
      prompt.result === undefined
      && prompt.playerId !== this.clientId
      && isSelfPlayBackgroundWait(prompt)
    );
    const pendingIds = new Set(pending.map(prompt => prompt.id));
    for (const [id, timer] of this.backgroundWaitTimers) {
      if (!pendingIds.has(id)) {
        clearTimeout(timer);
        this.backgroundWaitTimers.delete(id);
      }
    }

    for (const prompt of pending) {
      if (this.backgroundWaitTimers.has(prompt.id)) {
        continue;
      }
      const delay = selfPlayBackgroundWaitDelayMs(prompt);
      const timer = setTimeout(() => {
        this.backgroundWaitTimers.delete(prompt.id);
        if (this.gameState?.gameId === gameState.gameId) {
          this.gameService.resolvePrompt(gameState.gameId, prompt.id, null);
        }
      }, delay);
      this.backgroundWaitTimers.set(prompt.id, timer);
    }
  }

  private clearBackgroundWaitTimers() {
    for (const timer of this.backgroundWaitTimers.values()) {
      clearTimeout(timer);
    }
    this.backgroundWaitTimers.clear();
  }

  private seatClientId(state: State | undefined, sessionClientId: number): number {
    if (state?.gameSettings?.selfPlay === true) {
      return selfPlayFocusPlayerId(state);
    }
    return sessionClientId;
  }

  private updatePlayers(gameState: LocalGameState, clientId: number) {
    this.bottomPlayer = undefined;
    this.topPlayer = undefined;
    this.waiting = false;
    this.clientId = this.seatClientId(gameState?.state, clientId);

    if (!gameState || !gameState.state) {
      this.router.navigate(['/games']);
      return;
    }

    const state = gameState.state;
    const isSelfPlay = state.gameSettings?.selfPlay === true;
    if (state.players.length >= 1) {
      if (state.players[0].id === this.clientId) {
        this.bottomPlayer = state.players[0];
      } else {
        this.topPlayer = state.players[0];
      }
    }

    if (state.players.length >= 2) {
      if (this.bottomPlayer === state.players[0]) {
        this.topPlayer = state.players[1];
      } else {
        this.bottomPlayer = state.players[1];
      }

      if (gameState.switchSide && !isSelfPlay) {
        const tmp = this.topPlayer;
        this.topPlayer = this.bottomPlayer;
        this.bottomPlayer = tmp;
      }

      if (gameState.replay !== undefined) {
        this.clientId = this.bottomPlayer.id;
      }

      const prompts = state.prompts.filter(p => p.result === undefined);

      const isPlaying = state.players.some(p => p.id === this.clientId);
      const isReplay = !!this.gameState.replay;
      const isObserver = isReplay || !isPlaying;
      const gameFinished = state.phase === GamePhase.FINISHED || gameState.deleted;
      const waitingForOthers = prompts.some(p =>
        p.playerId !== this.clientId && (!isSelfPlay || promptRequiresSelfPlayFocus(p))
      );
      const waitingForMe = prompts.some(p => p.playerId === this.clientId);
      const notMyTurn = state.players[state.activePlayer].id !== this.clientId
        && state.phase === GamePhase.PLAYER_TURN;
      this.waiting = !gameFinished
        && (notMyTurn || waitingForOthers)
        && !waitingForMe
        && !isObserver;
    }

    // Do not set any global artworks map; overlays must come from the correct card list context
    this.cardsBaseService.setGlobalArtworksMap({});

    // Check if the game is in the FINISHED phase and update the game over state
    if (state.phase === GamePhase.FINISHED && !gameState.gameOver) {
      this.gameOverPrompt = new GameOverPrompt(this.clientId, state.winner);
      if (!this.showGameOver) {
        this.showMatchResultsSplash = true;
        this.showGameOver = false;
      } else {
        this.showMatchResultsSplash = false;
        this.showGameOver = true;
      }
    } else if (!gameState.deleted || state.phase !== GamePhase.FINISHED) {
      // Don't clear end-game UI just because the lobby deleted the game entry;
      // FINISHED may arrive in the same tick after core:deleteGame.
      if (state.phase !== GamePhase.FINISHED) {
        this.showGameOver = false;
        this.showMatchResultsSplash = false;
      }
    }
  }

  private updateGameState(state: LocalGameState) {
    this.gameState = state;
    // Show game over screen when the game is finished
    if (state && state.state && state.state.phase === GamePhase.FINISHED && !state.gameOver) {
      this.gameOverPrompt = new GameOverPrompt(this.clientId, state.state.winner);
      if (!this.showGameOver) {
        this.showMatchResultsSplash = true;
        this.showGameOver = false;
      } else {
        this.showMatchResultsSplash = false;
        this.showGameOver = true;
      }
    } else if (!state?.deleted || state?.state?.phase !== GamePhase.FINISHED) {
      if (state?.state?.phase !== GamePhase.FINISHED) {
        this.showGameOver = false;
        this.showMatchResultsSplash = false;
        this.gameOverPrompt = undefined;
      }
    }
    // Update player information
    this.updatePlayers(state, this.clientId);
  }

  onMatchResultsSplashDismiss(): void {
    this.showMatchResultsSplash = false;
    this.showGameOver = true;
  }

  onGameOverConfirm(): void {
    const localId = this.gameState?.localId;
    const isPlaying = this.gameState?.state?.players?.some((p: { id: number }) => p.id === this.clientId);
    if (!isPlaying || this.gameState?.replay) {
      this.finishAndNavigate(localId);
      return;
    }
    // XP gain screen temporarily hidden - navigate directly
    this.finishAndNavigate(localId);
    // this.battlePassService.getPendingMatchReward().pipe(
    //   untilDestroyed(this)
    // ).subscribe({
    //   next: (reward) => {
    //     if (reward) {
    //       this.xpGainData = reward;
    //       this.showXpGainScreen = true;
    //       // Keep showGameOver true so XP screen fades in on top; we never reveal the board
    //     } else {
    //       this.finishAndNavigate(localId);
    //     }
    //   },
    //   error: () => this.finishAndNavigate(localId)
    // });
  }

  onXpGainDismiss(): void {
    this.finishAndNavigate(this.gameState?.localId);
  }

  private finishAndNavigate(localId: number | undefined): void {
    if (localId) {
      this.gameService.removeLocalGameState(localId);
    }
    this.router.navigate(['/']);
    this.showXpGainScreen = false;
    this.xpGainData = null;
    this.showGameOver = false;
  }

  toggleSandboxSidebar() {
    this.sandboxSidebarCollapsed = !this.sandboxSidebarCollapsed;
  }
}
