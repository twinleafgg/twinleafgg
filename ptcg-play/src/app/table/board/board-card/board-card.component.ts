import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  ElementRef,
  HostBinding,
} from "@angular/core";
import {
  Card,
  CardList,
  PokemonCardList,
  Power,
  BoardEffect,
  SpecialCondition,
  StadiumDirection,
  SuperType,
  EnergyCard,
  CardType,
  PlayerType,
  SlotType,
  CardTag,
  Stage,
  PokemonCard,
} from "ptcg-server";
import {
  BoardInteractionService,
  AttackEffectEvent,
} from "../../../shared/services/board-interaction.service";
import { Subscription } from "rxjs";
import {
  BoardCardAnimationHelper,
  AnimationState,
} from "./board-card-animations.helper";
import { CardsBaseService } from "../../../shared/cards/cards-base.service";
import { getCustomEnergyIconPath } from "../../../shared/cards/energy-icons.utils";
import { resolveDualStadiumDisplayHalves } from "../../../shared/cards/dual-stadium.utils";
import { getBreakDisplayCards } from "../../../shared/cards/break-card-display.utils";

const MAX_ENERGY_CARDS = 8;

@Component({
  selector: "ptcg-board-card",
  templateUrl: "./board-card.component.html",
  styleUrls: ["./board-card.component.scss"],
})
export class BoardCardComponent implements OnInit, OnDestroy {
  // ==================== INPUT/OUTPUT PROPERTIES ====================
  private _cardList: CardList | PokemonCardList;

  @Input() showCardCount = false;
  @Output() cardClick = new EventEmitter<Card>();
  @Output() pokemonPlayed = new EventEmitter<{ pokemonId: string | number }>();

  @Input() set cardList(value: CardList | PokemonCardList) {
    this._cardList = value;
    this.resetCardState();
    this.isEmpty = !value || !value.cards.length;
    if (this.isEmpty) {
      return;
    }

    const cards: Card[] = value.cards;
    this.cardCount = cards.length;
    this.isSecret = value.isSecret;
    this.isPublic = value.isPublic;
    this.isFaceDown = value.isSecret || (!value.isPublic && !this.isOwner);

    if (value instanceof PokemonCardList) {
      this.initPokemonCardList(value);
      return;
    }

    this.applyCardListDisplay(value);
  }

  get cardList(): CardList | PokemonCardList {
    return this._cardList;
  }

  /**
   * Only the stadium slot renders a dual stadium as one card made of two
   * halves. Anywhere else (discard pile, lost zone, ...) each half is a normal
   * card of its own.
   */
  @Input() set allowDualStadium(value: boolean) {
    const allowed = !!value;
    if (allowed === this.dualStadiumAllowed) {
      return;
    }
    this.dualStadiumAllowed = allowed;
    if (
      this._cardList &&
      !this.isEmpty &&
      !(this._cardList instanceof PokemonCardList)
    ) {
      this.applyCardListDisplay(this._cardList);
    }
  }

  @Input() set owner(value: boolean) {
    this.isOwner = value;
    const isFaceDown = this.isSecret || (!this.isPublic && !this.isOwner);
    this.isFaceDown = !this.isEmpty && isFaceDown;
  }

  @Input() set card(value: Card) {
    this.mainCard = value;
    this.resetCardState();
    this.isEmpty = !value;
  }

  @Input() isFaceDown = false;

  // ==================== PUBLIC PROPERTIES ====================
  public isEmpty = true;
  public mainCard: Card;
  public breakCard: Card;
  public legendTopCard: Card;
  public legendBottomCard: Card;
  public vunionTopLeftCard: Card;
  public vunionTopRightCard: Card;
  public vunionBottomLeftCard: Card;
  public vunionBottomRightCard: Card;
  public dualStadiumLeftCard: Card;
  public dualStadiumRightCard: Card;
  public moreEnergies = 0;
  public cardCount = 0;
  public energyCards: Card[] = [];
  public trainerCard: Card;
  public powers: Power[] = [];
  public damage = 0;
  public specialConditions: SpecialCondition[] = [];
  public SpecialCondition = SpecialCondition;
  public isUpsideDown = false;
  public boardEffect: BoardEffect[] = [];
  public BoardEffect = BoardEffect;
  public hasImprisonMarker = false;
  @Input() sleeveImagePath?: string;

  get cardbackUrl(): string | undefined {
    return this.resolveSleeveCardbackUrl();
  }

  // Selection state for the card during board interaction mode
  public isSelectable = false;
  public isSelected = false;

  // Animation properties
  public showEvolutionAnimation = false;
  public showBasicAnimation = false;
  public showAttackAnimation = false;
  public showAttackEffect = false;
  public attackEffectType: CardType | null = null;

  // ==================== PRIVATE PROPERTIES ====================
  private isSecret = false;
  private isPublic = false;
  private isOwner = false;
  private dualStadiumAllowed = false;
  private subscriptions: Subscription[] = [];
  private cardTarget: { player: PlayerType; slot: SlotType; index: number };

  @Input() set player(value: PlayerType) {
    if (value !== undefined) {
      this.cardTarget = { ...this.cardTarget, player: value };
      this.updateSelectionState();
    }
  }

  @Input() set slot(value: SlotType) {
    if (value !== undefined) {
      this.cardTarget = { ...this.cardTarget, slot: value };
      this.updateSelectionState();
    }
  }

  @Input() set index(value: number) {
    if (value !== undefined) {
      this.cardTarget = { ...this.cardTarget, index: value };
      this.updateSelectionState();
    }
  }

  // Animation state properties
  private hasPlayedEvolutionAnimation = false;
  private hasPlayedBasicAnimation = false;
  private currentCardId: number | string;
  private animationElement: HTMLElement;
  private isInPrompt = false;
  private isAnimating = false;
  private lastAttackEffectId: string | null = null;

  constructor(
    private boardInteractionService: BoardInteractionService,
    private elementRef: ElementRef,
    private cardsBaseService: CardsBaseService,
  ) {
    this.cardTarget = { player: undefined, slot: undefined, index: 0 };
  }

  @HostBinding("style.--cardback-url")
  get cardbackCssVar(): string | null {
    return this.cardbackUrl ? `url(${this.cardbackUrl})` : null;
  }

  @HostBinding("class.dual-stadium-layout")
  get isDualStadiumLayout(): boolean {
    return !!(this.dualStadiumLeftCard && this.dualStadiumRightCard);
  }

  private resolveSleeveCardbackUrl(): string | undefined {
    if (this.sleeveImagePath) {
      return this.cardsBaseService.getSleeveUrl(this.sleeveImagePath);
    }
    const list: any = this._cardList;
    const sleeveImagePath = list?.sleeveImagePath as string | undefined;
    return this.cardsBaseService.getSleeveUrl(sleeveImagePath);
  }

  public resolveArtUrlFor(card: Card | undefined): string | undefined {
    if (!card || !this._cardList) return undefined;

    // Check artworksMap for deck-selected artworks
    const map = (this._cardList as any).artworksMap as
      | { [code: string]: { imageUrl: string } }
      | undefined;
    if (!map) return undefined;
    const entry = map[card.fullName];
    return entry?.imageUrl;
  }

  // ==================== LIFECYCLE METHODS ====================
  ngOnInit() {
    this.setupSubscriptions();
    this.createAnimationHandlers();
  }

  ngOnDestroy() {
    this.cleanupSubscriptions();
    this.cleanupAnimationHandlers();
  }

  // ==================== ANIMATION SYSTEM ====================
  private createAnimationHandlers() {
    this.animationEndHandler = (event: AnimationEvent) => {
      if (this.animationElement) {
        BoardCardAnimationHelper.removeAnimationEndListener(
          this.animationElement,
          this.animationEndHandler,
        );
        this.showEvolutionAnimation = false;
        this.hasPlayedEvolutionAnimation = true;
        this.animationElement = null;
        if (this._cardList instanceof PokemonCardList) {
          this._cardList.triggerEvolutionAnimation = false;
        }
      }
    };

    this.basicAnimationEndHandler = (event: AnimationEvent) => {
      if (this.animationElement) {
        BoardCardAnimationHelper.removeAnimationEndListener(
          this.animationElement,
          this.basicAnimationEndHandler,
        );
        this.showBasicAnimation = false;
        this.hasPlayedBasicAnimation = true;
        this.animationElement = null;
        if (this._cardList instanceof PokemonCardList) {
          this._cardList.showBasicAnimation = false;
        }
      }
    };
  }

  private cleanupAnimationHandlers() {
    if (this.animationElement) {
      BoardCardAnimationHelper.cleanupAnimationHandlers(
        this.animationElement,
        this.animationEndHandler,
        this.basicAnimationEndHandler,
      );
    }
  }

  private animationEndHandler = (event: AnimationEvent) => {};
  private basicAnimationEndHandler = (event: AnimationEvent) => {};

  private triggerEvolutionAnimation(cardList: PokemonCardList) {
    const animationState: AnimationState = {
      hasPlayedEvolutionAnimation: this.hasPlayedEvolutionAnimation,
      hasPlayedBasicAnimation: this.hasPlayedBasicAnimation,
      showEvolutionAnimation: this.showEvolutionAnimation,
      showBasicAnimation: this.showBasicAnimation,
      showAttackAnimation: this.showAttackAnimation,
      isInPrompt: this.isInPrompt,
      currentCardId: this.currentCardId,
    };

    if (
      BoardCardAnimationHelper.shouldTriggerEvolutionAnimation(
        this.mainCard,
        cardList,
        animationState,
      )
    ) {
      this.hasPlayedEvolutionAnimation = true;
      this.showEvolutionAnimation = true;

      setTimeout(() => {
        this.animationElement = BoardCardAnimationHelper.getAnimationElement(
          ".evolution-animation",
        );
        if (this.animationElement) {
          BoardCardAnimationHelper.addAnimationEndListener(
            this.animationElement,
            this.animationEndHandler,
          );
        }
      });
    }
  }

  private triggerBasicPokemonAnimation(cardList: PokemonCardList) {
    const animationState: AnimationState = {
      hasPlayedEvolutionAnimation: this.hasPlayedEvolutionAnimation,
      hasPlayedBasicAnimation: this.hasPlayedBasicAnimation,
      showEvolutionAnimation: this.showEvolutionAnimation,
      showBasicAnimation: this.showBasicAnimation,
      showAttackAnimation: this.showAttackAnimation,
      isInPrompt: this.isInPrompt,
      currentCardId: this.currentCardId,
    };

    if (
      BoardCardAnimationHelper.shouldTriggerBasicPokemonAnimation(
        this.mainCard,
        cardList,
        animationState,
      )
    ) {
      this.hasPlayedBasicAnimation = true;
      this.showBasicAnimation = true;

      setTimeout(() => {
        this.animationElement = BoardCardAnimationHelper.getAnimationElement(
          ".play-basic-animation",
        );
        if (this.animationElement) {
          BoardCardAnimationHelper.addAnimationEndListener(
            this.animationElement,
            this.basicAnimationEndHandler,
          );
        }
      });
    }
  }

  private triggerAttackAnimation(cardList: PokemonCardList) {
    const animationState: AnimationState = {
      hasPlayedEvolutionAnimation: this.hasPlayedEvolutionAnimation,
      hasPlayedBasicAnimation: this.hasPlayedBasicAnimation,
      showEvolutionAnimation: this.showEvolutionAnimation,
      showBasicAnimation: this.showBasicAnimation,
      showAttackAnimation: this.showAttackAnimation,
      isInPrompt: this.isInPrompt,
      currentCardId: this.currentCardId,
    };

    if (
      BoardCardAnimationHelper.shouldTriggerAttackAnimation(
        this.mainCard,
        cardList,
        animationState,
      )
    ) {
      this.showAttackAnimation = true;
      setTimeout(() => {
        this.showAttackAnimation = false;
        cardList.triggerAttackAnimation = false;
      }, 1000);
    }
  }

  private handleCardAnimations(cardList: PokemonCardList) {
    // Check if this is a new card instance
    const animationState: AnimationState = {
      hasPlayedEvolutionAnimation: this.hasPlayedEvolutionAnimation,
      hasPlayedBasicAnimation: this.hasPlayedBasicAnimation,
      showEvolutionAnimation: this.showEvolutionAnimation,
      showBasicAnimation: this.showBasicAnimation,
      showAttackAnimation: this.showAttackAnimation,
      isInPrompt: this.isInPrompt,
      currentCardId: this.currentCardId,
    };

    if (
      BoardCardAnimationHelper.isNewCardInstance(this.mainCard, animationState)
    ) {
      const newCardId = this.mainCard?.id;
      BoardCardAnimationHelper.resetAnimationStateForNewCard(
        animationState,
        newCardId,
      );
      this.currentCardId = newCardId;
      this.hasPlayedEvolutionAnimation =
        animationState.hasPlayedEvolutionAnimation;
      this.showEvolutionAnimation = animationState.showEvolutionAnimation;
      this.hasPlayedBasicAnimation = animationState.hasPlayedBasicAnimation;
      this.showBasicAnimation = animationState.showBasicAnimation;
      this.showEvolutionAnimation = animationState.showEvolutionAnimation;
    }

    this.triggerEvolutionAnimation(cardList);
    this.triggerBasicPokemonAnimation(cardList);
    this.triggerAttackAnimation(cardList);
  }

  private handleEvolutionAnimationEvent(event: any) {
    const slotMatch = String(this.cardTarget.slot) === String(event.slot);
    if (
      this.cardTarget &&
      event &&
      this.cardTarget.player === event.playerId &&
      slotMatch &&
      this.cardTarget.index === event.index &&
      this.mainCard &&
      this.mainCard.id === event.cardId
    ) {
      this.showEvolutionAnimation = true;
    }
  }

  private handleBasicAnimationEvent(event: any) {
    const slotMatch = String(this.cardTarget.slot) === String(event.slot);
    if (
      this.cardTarget &&
      event &&
      this.cardTarget.player === event.playerId &&
      slotMatch &&
      this.cardTarget.index === event.index &&
      this.mainCard &&
      this.mainCard.id === event.cardId
    ) {
      this.showBasicAnimation = true;
    }
  }

  private handleAttackAnimationEvent(event: any) {
    const slotMatch = String(this.cardTarget.slot) === String(event.slot);
    if (
      this.cardTarget &&
      event &&
      this.cardTarget.player === event.playerId &&
      slotMatch &&
      this.cardTarget.index === event.index &&
      this.mainCard &&
      this.mainCard.id === event.cardId
    ) {
      this.showAttackAnimation = true;
    }
  }

  private handleAttackEffectEvent(event: AttackEffectEvent) {
    // Check if this card is the opponent's active card
    // The effect should be shown on the opponent's active card (opponentId's active slot)
    if (!this.cardTarget || !this.cardTarget.player || !this.cardTarget.slot) {
      return;
    }

    // Check if this is an active card
    const isActiveCard =
      this.cardTarget.slot === SlotType.ACTIVE && this.cardTarget.index === 0;

    if (!isActiveCard) {
      return;
    }

    // Check if this card belongs to the opponent
    // If opponentPlayerType is provided, use it for precise matching
    if (event.opponentPlayerType !== undefined) {
      if (this.cardTarget.player !== event.opponentPlayerType) {
        return; // This is not the opponent's card
      }
    } else {
      // Fallback: exclude the attacking player's card if attack came from active slot
      // This works for two-player games where there's only one opponent active card
      if (event.slot === "active" && event.index === 0) {
        // Attack came from active slot - we can't determine which card is the opponent's
        // without PlayerType, so we show on any active card (works for two-player games)
      }
    }

    // Show effect on this opponent's active card

    // Create unique attack effect ID to prevent replay
    const attackEffectId = `${event.playerId}-${event.cardId}-${event.cardType}`;

    // Only show effect if it's a new attack (prevent replay)
    if (this.lastAttackEffectId === attackEffectId) {
      return;
    }

    // Show the effect
    this.attackEffectType = event.cardType;
    this.showAttackEffect = true;
    this.lastAttackEffectId = attackEffectId;

    // Auto-hide after animation duration (get from service or use default)
    setTimeout(() => {
      this.showAttackEffect = false;
      // Reset after a delay to allow for new attacks
      setTimeout(() => {
        if (this.lastAttackEffectId === attackEffectId) {
          this.lastAttackEffectId = null;
        }
      }, 500);
    }, 1500); // Default animation duration
  }

  @Input() set evolutionEntrance(value: boolean) {
    if (value && !this.isAnimating) {
      this.isAnimating = true;
      setTimeout(() => {
        this.isAnimating = false;
      }, 3000);
    }
  }

  @Input() set playBasicAnimation(value: boolean) {
    if (value && !this.isAnimating) {
      this.isAnimating = true;
      setTimeout(() => {
        this.isAnimating = false;
      }, 600);
    }
  }

  @Input() set inPrompt(value: boolean) {
    this.isInPrompt = value;
    if (value) {
      this.showEvolutionAnimation = false;
      this.showBasicAnimation = false;
      this.showEvolutionAnimation = false;
      if (this._cardList instanceof PokemonCardList) {
        this._cardList.triggerEvolutionAnimation = false;
        this._cardList.showBasicAnimation = false;
      }
    }
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================
  private setupSubscriptions() {
    // Selection mode changes
    this.subscriptions.push(
      this.boardInteractionService.selectionMode$.subscribe(() => {
        this.updateSelectionState();
      }),
    );

    // Selected targets changes
    this.subscriptions.push(
      this.boardInteractionService.selectedTargets$.subscribe(() => {
        this.updateSelectionState();
      }),
    );

    // Evolution animation events
    this.subscriptions.push(
      this.boardInteractionService.evolutionAnimation$.subscribe((event) => {
        this.handleEvolutionAnimationEvent(event);
      }),
    );

    // Basic animation events
    this.subscriptions.push(
      this.boardInteractionService.basicAnimation$.subscribe((event) => {
        this.handleBasicAnimationEvent(event);
      }),
    );

    // Attack animation events
    this.subscriptions.push(
      this.boardInteractionService.attackAnimation$.subscribe((event) => {
        this.handleAttackAnimationEvent(event);
      }),
    );

    // Attack effect events (for visual effects on opponent's card)
    this.subscriptions.push(
      this.boardInteractionService.attackEffect$.subscribe((event) => {
        this.handleAttackEffectEvent(event);
      }),
    );
  }

  private cleanupSubscriptions() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // ==================== SELECTION STATE MANAGEMENT ====================
  private updateSelectionState() {
    if (!this.cardTarget.player || !this.cardTarget.slot) {
      this.isSelectable = false;
      this.isSelected = false;
      return;
    }

    let isSelectionMode = false;
    this.boardInteractionService.selectionMode$
      .subscribe((mode) => {
        isSelectionMode = mode;
      })
      .unsubscribe();

    if (!isSelectionMode) {
      this.isSelectable = false;
      this.isSelected = false;
      return;
    }

    const hasCards =
      this._cardList && this._cardList.cards && this._cardList.cards.length > 0;
    this.isSelectable =
      hasCards &&
      this.boardInteractionService.isTargetEligible(this.cardTarget);
    this.isSelected = this.boardInteractionService.isTargetSelected(
      this.cardTarget,
    );
  }

  // ==================== CARD STATE MANAGEMENT ====================
  private resetCardState() {
    this.mainCard = undefined;
    this.dualStadiumLeftCard = undefined;
    this.dualStadiumRightCard = undefined;
    this.energyCards = [];
    this.trainerCard = undefined;
    this.moreEnergies = 0;
    this.cardCount = 0;
    this.damage = 0;
    this.specialConditions = [];
    this.isFaceDown = false;
    this.boardEffect = [];
    this.isUpsideDown =
      this._cardList?.stadiumDirection === StadiumDirection.DOWN;
    this.showEvolutionAnimation = false;
    this.showBasicAnimation = false;
    this.showEvolutionAnimation = false;
    this.showAttackAnimation = false;
    this.showAttackEffect = false;
    this.attackEffectType = null;
  }

  private applyCardListDisplay(cardList: CardList) {
    const dualHalves = this.dualStadiumAllowed
      ? resolveDualStadiumDisplayHalves(cardList.cards)
      : null;
    if (dualHalves) {
      this.dualStadiumLeftCard = dualHalves[0];
      this.dualStadiumRightCard = dualHalves[1];
      this.mainCard = undefined;
      return;
    }

    this.dualStadiumLeftCard = undefined;
    this.dualStadiumRightCard = undefined;
    this.mainCard = cardList.cards[cardList.cards.length - 1];
  }

  private initPokemonCardList(cardList: PokemonCardList) {
    this.damage = cardList.damage;
    this.specialConditions = cardList.specialConditions;
    this.boardEffect = cardList.boardEffect;
    this.hasImprisonMarker = cardList.marker.hasMarker("IMPRISON_MARKER");

    this.setupPokemonCards(cardList);
    this.setupEnergyCards(cardList);
    this.handleCardAnimations(cardList);
  }

  // ==================== CARD SETUP METHODS ====================
  private setupPokemonCards(cardList: PokemonCardList) {
    const pokemonCard = cardList.getPokemonCard();

    const breakDisplay = getBreakDisplayCards(cardList);
    this.mainCard = breakDisplay.mainCard;
    this.breakCard = breakDisplay.breakCard;

    // Handle Legend cards
    if (pokemonCard?.tags.includes(CardTag.LEGEND)) {
      this.setupLegendCards(cardList);
    } else {
      this.legendTopCard = undefined;
      this.legendBottomCard = undefined;
    }

    // Handle V-Union cards
    if (pokemonCard?.tags.includes(CardTag.POKEMON_VUNION)) {
      this.setupVUnionCards(cardList);
    } else {
      this.vunionTopLeftCard = undefined;
      this.vunionTopRightCard = undefined;
      this.vunionBottomLeftCard = undefined;
      this.vunionBottomRightCard = undefined;
    }

    this.trainerCard = cardList.tools[0];
  }

  private setupLegendCards(cardList: PokemonCardList) {
    const topCard = cardList.cards.find(
      (card) =>
        card.superType === SuperType.POKEMON &&
        card.tags.includes(CardTag.LEGEND) &&
        card.fullName.includes("(Top)"),
    );
    const bottomCard = cardList.cards.find(
      (card) =>
        card.superType === SuperType.POKEMON &&
        card.tags.includes(CardTag.LEGEND) &&
        card.fullName.includes("(Bottom)"),
    );
    this.legendTopCard = topCard;
    this.legendBottomCard = bottomCard;
  }

  private setupVUnionCards(cardList: PokemonCardList) {
    const topLeftCard = cardList.cards.find(
      (card) =>
        card.superType === SuperType.POKEMON &&
        card.tags.includes(CardTag.POKEMON_VUNION) &&
        card.fullName.includes("(Top Left)"),
    );
    const topRightCard = cardList.cards.find(
      (card) =>
        card.superType === SuperType.POKEMON &&
        card.tags.includes(CardTag.POKEMON_VUNION) &&
        card.fullName.includes("(Top Right)"),
    );
    const bottomLeftCard = cardList.cards.find(
      (card) =>
        card.superType === SuperType.POKEMON &&
        card.tags.includes(CardTag.POKEMON_VUNION) &&
        card.fullName.includes("(Bottom Left)"),
    );
    const bottomRightCard = cardList.cards.find(
      (card) =>
        card.superType === SuperType.POKEMON &&
        card.tags.includes(CardTag.POKEMON_VUNION) &&
        card.fullName.includes("(Bottom Right)"),
    );
    this.vunionTopLeftCard = topLeftCard;
    this.vunionTopRightCard = topRightCard;
    this.vunionBottomLeftCard = bottomLeftCard;
    this.vunionBottomRightCard = bottomRightCard;
  }

  private setupEnergyCards(cardList: PokemonCardList) {
    for (const card of cardList.energies.cards) {
      if (this.energyCards.length < MAX_ENERGY_CARDS) {
        this.energyCards.push(card);
      } else {
        this.moreEnergies++;
      }
    }
  }

  // ==================== CUSTOM IMAGE HELPERS ====================
  getCustomEnergyIcon(card: Card, isAttachedAsEnergy: boolean = false): string {
    const iconPath = getCustomEnergyIconPath(card, isAttachedAsEnergy);
    return iconPath || "";
  }

  getCustomToolIcon(card: Card): string {
    const customToolIcon = {
      "Vitality Band": "assets/tools/vitality-band.png",
      "Bravery Charm": "assets/tools/bravery-charm.png",
    };

    if (
      card &&
      card.superType === SuperType.TRAINER &&
      customToolIcon[card.name]
    ) {
      return customToolIcon[card.name];
    }
    return "";
  }

  // ==================== EVENT HANDLERS ====================
  public onCardClick(card: Card) {
    this.cardClick.emit(card);
  }

  // ==================== UTILITY METHODS ====================
  public getRotationClass(): string {
    if (this.specialConditions.includes(SpecialCondition.ASLEEP)) {
      return "asleep-position";
    }
    if (this.specialConditions.includes(SpecialCondition.CONFUSED)) {
      return "confused-position";
    }
    if (this.specialConditions.includes(SpecialCondition.PARALYZED)) {
      return "paralyzed-position";
    }
    return "";
  }

  // Expose _cardList for template use (for tools display)
  get cardListInternal(): CardList | PokemonCardList {
    return this._cardList;
  }
}
