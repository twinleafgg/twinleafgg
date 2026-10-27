import {
  CardList,
  CardTag,
  CardType,
  ChooseCardsPrompt,
  ConfirmPrompt,
  EnergyCard,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  PowerType,
  ShowCardsPrompt,
  SlotType,
  Stage,
  State,
  StoreLike,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_ABILITY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class MegaRayquazaex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 280;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Champion\'s Roar',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may use this Ability. Look at the top 4 cards of your deck and attach a Basic Energy you find there to this Pokémon. Shuffle the remaining cards and put them on the bottom of your deck.',
  }];

  public attacks = [{
    name: 'Storm Emeralda',
    cost: [R, L, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'This attack does 50 damage times the number of [R] and [L] Energy attached to all of your Pokémon in play.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'M6';
  public setNumber: string = '58';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Rayquaza ex';
  public fullName: string = 'Mega Rayquaza ex M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this && effect.slot === SlotType.BENCH && effect.target.cards.length === 0) {
      return this.useChampionsRoar(store, state, effect);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = 50 * this.countFireAndLightningEnergy(store, state, effect.player);
    }
    return state;
  }

  private useChampionsRoar(store: StoreLike, state: State, effect: PlayPokemonEffect): State {
    const player = effect.player;
    if (player.deck.cards.length === 0 || IS_ABILITY_BLOCKED(store, state, player, this)) {
      return state;
    }

    return store.prompt(state, new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY), (wantToUse) => {
      if (!wantToUse) {
        return;
      }

      const topCards = new CardList();
      const count = Math.min(4, player.deck.cards.length);
      state = MOVE_CARDS(store, state, player.deck, topCards, { count, sourceCard: this });

      const hasBasicEnergy = topCards.cards.some(
        (card) => card instanceof EnergyCard && card.energyType === EnergyType.BASIC,
      );

      store.prompt(state, new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, topCards.cards), () => {
        if (!hasBasicEnergy) {
          MOVE_CARDS(store, state, topCards, player.deck, { toBottom: true });
          return;
        }

        this.chooseEnergyToAttach(store, state, effect, topCards);
      });
    });
  }

  private chooseEnergyToAttach(store: StoreLike, state: State, effect: PlayPokemonEffect, topCards: CardList): void {
    const player = effect.player;
    store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        topCards,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 0, max: 1 },
      ),
      (cards) => {
        const energyCard = (cards || [])[0] as EnergyCard | undefined;
        if (energyCard) {
          MOVE_CARDS(store, state, topCards, effect.target, { cards: [energyCard], sourceCard: this });
          store.reduceEffect(state, new AttachEnergyEffect(player, energyCard, effect.target));
        }

        MOVE_CARDS(store, state, topCards, player.deck, { toBottom: true });
      },
    );
  }

  private countFireAndLightningEnergy(store: StoreLike, state: State, player: State['players'][number]): number {
    const countedTypes = [CardType.FIRE, CardType.LIGHTNING, CardType.ANY];
    let energyCount = 0;

    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const checkEnergy = new CheckProvidedEnergyEffect(player, cardList);
      store.reduceEffect(state, checkEnergy);
      energyCount += checkEnergy.energyMap.reduce(
        (sum, energy) => sum + energy.provides.filter((type) => countedTypes.includes(type)).length,
        0,
      );
    });

    return energyCount;
  }
}
