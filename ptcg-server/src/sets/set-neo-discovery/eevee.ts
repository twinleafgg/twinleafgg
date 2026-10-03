import { PokemonCard } from '../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../game/store/card/card-types';
import { PowerType } from '../../game/store/card/pokemon-types';
import { State, StoreLike, GameMessage, Card, ChooseCardsPrompt, ShuffleDeckPrompt } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { AttachEnergyEffect, CoinFlipEffect } from '../../game/store/effects/play-card-effects';
import { PowerEffect } from '../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

// Mapping of CardType to CardType for energy evolution lookup
const ENERGY_TYPE_MAP: Partial<Record<CardType, CardType>> = {
  [CardType.GRASS]: CardType.GRASS,
  [CardType.FIRE]: CardType.FIRE,
  [CardType.WATER]: CardType.WATER,
  [CardType.LIGHTNING]: CardType.LIGHTNING,
  [CardType.PSYCHIC]: CardType.PSYCHIC,
  [CardType.DARK]: CardType.DARK,
  [CardType.FAIRY]: CardType.FAIRY,
};

export class Eevee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Energy Evolution',
    powerType: PowerType.POKEMON_POWER,
    text: 'Whenever you attach an Energy card to Eevee, flip a coin. If heads, search your deck for a card that evolves from Eevee that is the same type as the Energy card you attached to Eevee. Attach that card to Eevee. This counts as evolving Eevee. Shuffle your deck afterward. This power can\'t be used if Eevee is Asleep, Confused, or Paralyzed.',
  }];

  public attacks = [{
    name: 'Smash Kick',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'N2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Eevee';
  public fullName: string = 'Eevee N2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Evolution
    if (effect instanceof AttachEnergyEffect && effect.target.cards.includes(this)) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      try {
        const powerEffect = new PowerEffect(player, this.powers[0], this);
        store.reduceEffect(state, powerEffect);
      } catch {
        return state;
      }

      // Flip a coin
      const coinFlip = new CoinFlipEffect(player);
      state = store.reduceEffect(state, coinFlip);
      if (!coinFlip.result) {
        return state;
      }

      const energyType = effect.energyCard.provides[0];
      if (!energyType) {
        return state;
      }
      const eeveeloutionType = ENERGY_TYPE_MAP[energyType];
      if (!eeveeloutionType || eeveeloutionType === CardType.COLORLESS) {
        return state;
      }

      if (player.deck.cards.length === 0) {
        return state;
      }

      let cards: Card[] = [];
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.deck,
        { superType: SuperType.POKEMON, stage: Stage.STAGE_1, evolvesFrom: 'Eevee', cardType: [eeveeloutionType] },
        { min: 0, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.active, { cards: cards, sourceCard: this });
          player.active.clearEffects();
          player.active.pokemonPlayedTurn = state.turn;
        }
      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }

    return state;
  }
}