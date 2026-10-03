import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  StateUtils,
  ChooseCardsPrompt,
  Card,
  PowerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {IS_POKEBODY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE } from '../../../game/store/prefabs/attack-effects';

export class Gengar extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Haunter';
  protected _tags = [CardTag.PRIME];
  public cardType: CardType[] = [P];
  public hp: number = 130;
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public powers = [
    {
      name: 'Catastrophe',
      powerType: PowerType.POKEBODY,
      text: "As long as Gengar is your Active Pokémon, if any of your opponent's Pokémon would be Knocked Out, put that Pokémon in the Lost Zone instead of discarding it. (Discard all cards attached to that Pokémon.)",
    },
  ];

  public attacks = [
    {
      name: 'Hurl into Darkness',
      cost: [P],
      damage: 0,
      text: "Look at your opponent's hand and choose a number of Pokémon you find there up to the number of [P] Energy attached to Gengar. Put the Pokémon you chose in the Lost Zone.",
    },
    {
      name: 'Cursed Drop',
      cost: [P, C],
      damage: 0,
      text: "Put 4 damage counters on your opponent's Pokémon in any way you like.",
    },
  ];

  public set: string = 'TM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Gengar';
  public fullName: string = 'Gengar TM';

  public readonly LOST_CITY_MARKER = 'LOST_CITY_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (
        opponent.active.getPokemonCard() === this &&
        !IS_POKEBODY_BLOCKED(store, state, opponent, this)
      ) {
        const card = effect.target.getPokemonCard();
        if (card !== undefined && !card.hasTag(CardTag.PRISM_STAR)) {
          // Don't prevent default behavior yet - let other cards handle the knockout first
          // We'll handle moving to lost zone in the game reducer
          effect.target.marker.addMarker(this.LOST_CITY_MARKER, this);
        }
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      // get the Energy attached to Gengar
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);

      let psychicEnergyCount = 0;
      checkProvidedEnergy.energyMap.forEach((em) => {
        if (em.provides.includes(CardType.PSYCHIC) || em.provides.includes(CardType.ANY)) {
          psychicEnergyCount++;
        }
      });

      const maxDiscard = Math.min(opponent.hand.cards.length, psychicEnergyCount);

      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          { superType: SuperType.POKEMON },
          { min: 0, max: maxDiscard, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.lostzone, { cards: cards, sourceCard: this });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE(4, store, state, effect);
    }

    return state;
  }
}
