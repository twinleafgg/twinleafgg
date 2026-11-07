import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Archetype, Format, GameSettings, GameState } from 'ptcg-server';
import { forkJoin, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { ApiError } from '../../api/api.error';
import { DeckListEntry } from '../../api/interfaces/deck.interface';
import { DeckService } from '../../api/services/deck.service';
import { GameService } from '../../api/services/game.service';
import { MainService } from '../../api/services/main.service';
import { AlertService } from '../../shared/alert/alert.service';
import { SessionService } from '../../shared/session/session.service';
import { SelectPopupOption } from '../../shared/alert/select-popup/select-popup.component';
import { ArchetypeUtils } from '../../deck/deck-archetype-service/archetype.utils';
import { FormatValidator } from '../../util/formats-validator';
import { GAME_RULE_OPTIONS, RuleOption } from '../game-rules';

/**
 * Full page for starting a game against yourself, reachable from `/games/self-play`.
 * Uses the same layout as the create game page.
 */
@Component({
  selector: 'ptcg-self-play-page',
  templateUrl: './self-play-page.component.html',
  styleUrls: [
    '../create-game-page/create-game-page.component.scss',
    './self-play-page.component.scss'
  ]
})
export class SelfPlayPageComponent implements OnInit {

  public settings = new GameSettings();
  public isAdmin = false;
  public loadingDecks = false;
  public submitting = false;
  public error: string | null = null;
  public deckId: number | null = null;
  public secondDeckId: number | null = null;
  public deckEntries: DeckListEntry[] = [];
  public formatValidDecks: SelectPopupOption<number>[] = [];

  public rules: RuleOption[] = GAME_RULE_OPTIONS;

  public formats = [
    { value: Format.STANDARD, label: 'LABEL_STANDARD' },
    { value: Format.STANDARD_NIGHTLY, label: 'LABEL_STANDARD_NIGHTLY' },
    { value: Format.GLC, label: 'LABEL_GLC' },
    { value: Format.EXPANDED, label: 'LABEL_EXPANDED' },
    { value: Format.UNLIMITED, label: 'LABEL_UNLIMITED' },
    { value: Format.ETERNAL, label: 'LABEL_ETERNAL' },
    { value: Format.SWSH, label: 'LABEL_SWSH' },
    { value: Format.SM, label: 'LABEL_SM' },
    { value: Format.XY, label: 'LABEL_XY' },
    { value: Format.BW, label: 'LABEL_BW' },
    { value: Format.RSPK, label: 'LABEL_RSPK' },
    { value: Format.RETRO, label: 'LABEL_RETRO' },
    { value: Format.THEME, label: 'FORMAT_THEME' },
  ];

  public timeLimits: SelectPopupOption<number>[] = [
    { value: 0, viewValue: 'GAMES_LIMIT_NO_LIMIT' },
    { value: 600, viewValue: 'GAMES_LIMIT_10_MIN' },
    { value: 900, viewValue: 'GAMES_LIMIT_15_MIN' },
    { value: 1200, viewValue: 'GAMES_LIMIT_20_MIN' },
    { value: 1500, viewValue: 'GAMES_LIMIT_25_MIN' },
    { value: 1800, viewValue: 'GAMES_LIMIT_30_MIN' },
  ];

  private formatDefaultDecks: { [format: string]: number } = {};
  private defaultDeckId: number | null = null;

  constructor(
    private router: Router,
    private deckService: DeckService,
    private mainService: MainService,
    private gameService: GameService,
    private sessionService: SessionService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {
    this.settings.format = Format.STANDARD;
    this.settings.timeLimit = 1200;
  }

  ngOnInit() {
    this.loadDefaultDeckPreferences();

    const session = this.sessionService.session;
    const loggedUserId = session && session.loggedUserId;
    const loggedUser = session && session.users && session.users[loggedUserId];
    this.isAdmin = !!loggedUser && loggedUser.roleId === 4;
    this.settings.recordingEnabled = !this.isAdmin;

    this.loadDecks();
  }

  public onFormatSelected(format: Format) {
    this.settings.format = format;
    this.deckEntries = this.decksForFormat(format);
    this.formatValidDecks = this.deckEntries.map(deck => ({ value: deck.id, viewValue: deck.name }));

    if (this.formatValidDecks.length === 0) {
      this.deckId = null;
      this.secondDeckId = null;
      return;
    }

    const defaultDeckId = this.getFormatDefaultDeckId(format);
    const defaultExists = this.formatValidDecks.some(deck => deck.value === defaultDeckId);
    const nextId = defaultExists ? defaultDeckId : this.formatValidDecks[0].value;
    this.deckId = nextId;
    this.secondDeckId = nextId;
  }

  public selectDeck(deckId: number) {
    this.deckId = deckId;
  }

  public selectSecondDeck(deckId: number) {
    this.secondDeckId = deckId;
  }

  public trackByDeckId(index: number, deck: SelectPopupOption<number>): number {
    return deck.value;
  }

  public getDeckArchetype(deckId: number): Archetype | Archetype[] {
    const deckEntry = this.deckEntries.find(deck => deck.id === deckId);
    if (!deckEntry) {
      return Archetype.UNOWN;
    }

    if (deckEntry.manualArchetype1 || deckEntry.manualArchetype2) {
      const archetypes = [];
      if (deckEntry.manualArchetype1) {
        archetypes.push(deckEntry.manualArchetype1);
      }
      if (deckEntry.manualArchetype2) {
        archetypes.push(deckEntry.manualArchetype2);
      }
      return archetypes.length > 0 ? archetypes : Archetype.UNOWN;
    }

    return ArchetypeUtils.getArchetype(deckEntry.deckItems, false);
  }

  public onSandboxModeChange(enabled: boolean) {
    if (!enabled) {
      this.clearSandboxOptions();
    }
  }

  public canSubmit(): boolean {
    return !this.submitting
      && !this.loadingDecks
      && this.deckId != null
      && this.secondDeckId != null;
  }

  public cancel() {
    if (this.submitting) {
      return;
    }
    this.router.navigate(['/games']);
  }

  public confirm() {
    if (!this.canSubmit() || this.deckId == null || this.secondDeckId == null) {
      return;
    }
    this.submitting = true;
    this.error = null;

    forkJoin([
      this.deckService.getDeck(this.deckId),
      this.deckService.getDeck(this.secondDeckId)
    ]).pipe(
      switchMap(([first, second]) => {
        const deck1 = first.deck;
        const deck2 = second.deck;
        if (!deck1 || !deck1.cards || deck1.cards.length === 0
          || !deck2 || !deck2.cards || deck2.cards.length === 0) {
          this.error = this.translate.instant('REACT_ERROR_LOAD_DECKS');
          return of(null);
        }
        return this.mainService.createSelfPlayGame({
          deck: deck1.cards,
          secondDeck: deck2.cards,
          gameSettings: this.buildGameSettings(),
          deckId: deck1.id,
          secondDeckId: deck2.id,
          sleeveImagePath: deck1.sleeveImagePath,
          secondSleeveImagePath: deck2.sleeveImagePath,
          deckBoxImagePath: deck1.deckBoxImagePath,
          secondDeckBoxImagePath: deck2.deckBoxImagePath,
          coinImagePath: deck1.coinImagePath,
          secondCoinImagePath: deck2.coinImagePath
        }).pipe(
          switchMap(gameState => this.joinAndOpen(gameState))
        );
      }),
      finalize(() => { this.submitting = false; })
    ).subscribe({
      next: opened => {
        if (opened) {
          this.alertService.toast(this.translate.instant('REACT_SELF_PLAY_SNACKBAR'));
        }
      },
      error: (error: ApiError) => {
        this.error = (error && error.message) || this.translate.instant('REACT_ERROR_CREATE_GAME');
      }
    });
  }

  private joinAndOpen(gameState: GameState) {
    return this.gameService.join(gameState.gameId).pipe(
      map(() => {
        const session = this.sessionService.session;
        const gameStates = session && session.gameStates ? session.gameStates : [];
        const local = gameStates.find(g => g.gameId === gameState.gameId && g.deleted === false);
        if (!local) {
          this.error = this.translate.instant('REACT_ERROR_CREATE_GAME');
          return false;
        }
        this.router.navigate(['/table', local.localId]);
        return true;
      })
    );
  }

  private buildGameSettings(): GameSettings {
    const gs = new GameSettings();
    gs.format = this.settings.format;
    gs.timeLimit = this.settings.timeLimit;
    gs.recordingEnabled = this.settings.recordingEnabled;
    gs.rules = this.settings.rules;
    gs.sandboxMode = this.isAdmin && this.settings.sandboxMode === true;
    if (gs.sandboxMode) {
      gs.sandboxAllPokemonBasic = this.settings.sandboxAllPokemonBasic;
      gs.sandboxAttacksCostNoEnergy = this.settings.sandboxAttacksCostNoEnergy;
      gs.sandboxRetreatCostsNoEnergy = this.settings.sandboxRetreatCostsNoEnergy;
    }
    gs.selfPlay = true;
    return gs;
  }

  private decksForFormat(format: Format): DeckListEntry[] {
    return this.decks.filter(deck => {
      return deck.format.includes(format) && FormatValidator.isDeckValidForFormat(deck, format);
    });
  }

  private loadDecks() {
    this.loadingDecks = true;
    this.deckService.getList({ summary: true })
      .pipe(finalize(() => { this.loadingDecks = false; }))
      .subscribe({
        next: response => {
          this.decks = response.decks || [];
          this.onFormatSelected(this.settings.format);
        },
        error: () => {
          this.decks = [];
          this.deckEntries = [];
          this.formatValidDecks = [];
          this.deckId = null;
          this.secondDeckId = null;
          this.error = this.translate.instant('REACT_ERROR_LOAD_DECKS');
        }
      });
  }

  private clearSandboxOptions() {
    this.settings.sandboxMode = false;
    this.settings.sandboxAllPokemonBasic = false;
    this.settings.sandboxAttacksCostNoEnergy = false;
    this.settings.sandboxRetreatCostsNoEnergy = false;
  }

  private loadDefaultDeckPreferences() {
    const savedDefaultDeckId = localStorage.getItem('defaultDeckId');
    if (savedDefaultDeckId) {
      this.defaultDeckId = parseInt(savedDefaultDeckId, 10);
    }
    const savedFormatDefaults = localStorage.getItem('formatDefaultDecks');
    if (savedFormatDefaults) {
      this.formatDefaultDecks = JSON.parse(savedFormatDefaults);
    }
  }

  private getFormatDefaultDeckId(format: Format): number | null {
    const formatKeyMap: { [key: number]: string } = {
      [Format.STANDARD]: 'standard',
      [Format.STANDARD_NIGHTLY]: 'standard_nightly',
      [Format.GLC]: 'glc',
      [Format.EXPANDED]: 'expanded',
      [Format.UNLIMITED]: 'unlimited',
      [Format.ETERNAL]: 'eternal',
      [Format.SWSH]: 'swsh',
      [Format.SM]: 'sm',
      [Format.XY]: 'xy',
      [Format.BW]: 'bw',
      [Format.RSPK]: 'rspk',
      [Format.RETRO]: 'retro',
      [Format.THEME]: 'theme'
    };
    const formatKey = formatKeyMap[format];
    if (formatKey && this.formatDefaultDecks[formatKey]) {
      return this.formatDefaultDecks[formatKey];
    }
    return this.defaultDeckId;
  }

  private decks: DeckListEntry[] = [];

}
