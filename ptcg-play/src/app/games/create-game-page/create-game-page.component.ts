import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Archetype, Format, GameSettings, GameState } from 'ptcg-server';
import { of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { DeckListEntry } from '../../api/interfaces/deck.interface';
import { DeckService } from '../../api/services/deck.service';
import { MainService } from '../../api/services/main.service';
import { AlertService } from '../../shared/alert/alert.service';
import { SelectPopupOption } from '../../shared/alert/select-popup/select-popup.component';
import { SessionService } from '../../shared/session/session.service';
import { ArchetypeUtils } from '../../deck/deck-archetype-service/archetype.utils';
import { FormatValidator } from '../../util/formats-validator';
import { GAME_RULE_OPTIONS, RuleOption } from '../game-rules';

/**
 * Full page for creating a game or inviting a player, reachable from
 * `/games/create` and `/games/create/:clientId`.
 */
@Component({
  selector: 'ptcg-create-game-page',
  templateUrl: './create-game-page.component.html',
  styleUrls: ['./create-game-page.component.scss']
})
export class CreateGamePageComponent implements OnInit {

  public decks: SelectPopupOption<DeckListEntry>[] = [];
  public deckId: number | null = null;
  public settings = new GameSettings();
  public isAdmin = false;
  public invitedUserId?: number;
  public isInvitingBot = false;
  public botFormat?: Format;
  public formatLocked = false;
  public loadingDecks = false;
  public submitting = false;
  public error: string | null = null;

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
    // { value: Format.PRE_RELEASE, label: 'LABEL_PRE_RELEASE' },
  ];

  public formatValidDecks: SelectPopupOption<number>[] = [];
  public deckEntries: DeckListEntry[] = [];
  public formatDefaultDecks: { [format: string]: number } = {};
  public defaultDeckId: number | null = null;

  public rules: RuleOption[] = GAME_RULE_OPTIONS;

  public timeLimits: SelectPopupOption<number>[] = [
    { value: 0, viewValue: 'GAMES_LIMIT_NO_LIMIT' },
    { value: 600, viewValue: 'GAMES_LIMIT_10_MIN' },
    { value: 900, viewValue: 'GAMES_LIMIT_15_MIN' },
    { value: 1200, viewValue: 'GAMES_LIMIT_20_MIN' },
    { value: 1500, viewValue: 'GAMES_LIMIT_25_MIN' },
    { value: 1800, viewValue: 'GAMES_LIMIT_30_MIN' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private deckService: DeckService,
    private mainService: MainService,
    private sessionService: SessionService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {
    this.settings.format = Format.STANDARD;
  }

  ngOnInit() {
    this.invitedUserId = this.readInvitedUserId();
    this.loadDefaultDeckPreferences();

    const session = this.sessionService.session;
    const loggedUserId = session && session.loggedUserId;
    const loggedUser = session && session.users && session.users[loggedUserId];
    this.isAdmin = !!loggedUser && loggedUser.roleId === 4;
    this.settings.recordingEnabled = !this.isAdmin;

    if (this.invitedUserId !== undefined) {
      this.detectBot(this.invitedUserId);
    }

    this.loadDecks();
  }

  public hasValidDeck(): boolean {
    if (this.deckId == null) {
      return false;
    }
    const selectedDeck = this.decks.find(d => d.value.id === this.deckId);
    if (!selectedDeck) {
      return false;
    }
    if (!selectedDeck.value.format.includes(this.settings.format)) {
      return false;
    }
    return FormatValidator.isDeckValidForFormat(selectedDeck.value, this.settings.format);
  }

  public confirm() {
    if (!this.hasValidDeck() || this.submitting) {
      return;
    }
    this.submitting = true;
    this.error = null;

    this.deckService.getDeck(this.deckId).pipe(
      switchMap(deckResult => {
        const cards = deckResult && deckResult.deck && deckResult.deck.cards;
        if (!cards || cards.length === 0) {
          this.error = this.translate.instant('REACT_ERROR_LOAD_DECKS');
          return of(null);
        }
        return this.mainService.createGame(
          cards,
          this.settings,
          this.invitedUserId,
          this.deckId,
          deckResult.deck.sleeveImagePath
        );
      }),
      finalize(() => { this.submitting = false; })
    ).subscribe({
      next: (gameState: GameState) => {
        this.openTable(gameState);
      },
      error: () => {
        this.alertService.toast(this.translate.instant('ERROR_UNKNOWN'));
      }
    });
  }

  public cancel() {
    this.router.navigate(['/games']);
  }

  public onSandboxModeChange(enabled: boolean) {
    if (!enabled) {
      this.clearSandboxOptions();
    }
  }

  public onFormatSelected(format: Format) {
    this.settings.format = format;
    this.deckEntries = this.decks.filter(d => {
      const deck = d.value;
      return deck.format.includes(format) && FormatValidator.isDeckValidForFormat(deck, format);
    }).map(d => d.value);

    this.formatValidDecks = this.deckEntries.map(d => ({ value: d.id, viewValue: d.name }));

    if (this.formatValidDecks.length > 0) {
      const defaultDeckId = this.getFormatDefaultDeckId(format);
      const defaultDeckExists = this.formatValidDecks.some(deck => deck.value === defaultDeckId);
      this.deckId = defaultDeckExists ? defaultDeckId : this.formatValidDecks[0].value;
    } else {
      this.deckId = null;
    }
  }

  public selectDeck(deckId: number) {
    this.deckId = deckId;
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

  private openTable(gameState: GameState) {
    if (!gameState) {
      this.router.navigate(['/games']);
      return;
    }
    const session = this.sessionService.session;
    const gameStates = session && session.gameStates ? session.gameStates : [];
    const local = gameStates.find(g => g.gameId === gameState.gameId && g.deleted === false);
    this.router.navigate(['/table', local ? local.localId : gameState.gameId]);
  }

  private readInvitedUserId(): number | undefined {
    const param = this.route.snapshot.paramMap.get('clientId');
    const clientId = param !== null ? parseInt(param, 10) : NaN;
    return isNaN(clientId) ? undefined : clientId;
  }

  private loadDecks() {
    this.loadingDecks = true;
    this.deckService.getList({ summary: true })
      .pipe(finalize(() => { this.loadingDecks = false; }))
      .subscribe({
        next: response => {
          this.decks = (response.decks || []).map(deckEntry => ({
            value: deckEntry,
            viewValue: deckEntry.name
          }));
          this.onFormatSelected(this.settings.format);
        },
        error: () => {
          this.decks = [];
          this.formatValidDecks = [];
          this.deckId = null;
          this.error = this.translate.instant('REACT_ERROR_LOAD_DECKS');
        }
      });
  }

  private detectBot(clientId: number) {
    const session = this.sessionService.session;
    if (!session) {
      return;
    }
    const client = session.clients.find(c => c.clientId === clientId);
    const invitedUser = client && session.users[client.userId];
    if (!invitedUser) {
      return;
    }

    const botFormatMap: { [key: string]: Format } = {
      'Standard': Format.STANDARD,
      'Standard Nightly': Format.STANDARD_NIGHTLY,
      'Expanded': Format.EXPANDED,
      'GLC': Format.GLC,
      'Retro': Format.RETRO,
      'Theme': Format.THEME
    };

    const format = botFormatMap[invitedUser.name];
    if (format === undefined) {
      return;
    }

    this.isInvitingBot = true;
    this.botFormat = format;
    this.formatLocked = true;
    this.settings.format = format;
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
}
