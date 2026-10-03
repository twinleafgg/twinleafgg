import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Tyranitarex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Pupitar';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [D];
  public hp: number = 340;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Grind',
      cost: [C],
      damage: 50,
      damageCalculation: 'x',
      text: 'This attack does 50 damage for each Energy attached to this Pokémon.',
    },
    {
      name: 'Tyranical Crush',
      cost: [D, C, C],
      damage: 150,
      text: "Discard a random card from your opponent's hand.",
    },
  ];

  public set: string = 'PRE';
  public regulationMark = 'H';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Tyranitar ex';
  public fullName: string = 'Tyranitar ex PRE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Grind
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const energies = player.active.cards.filter((card) => card.superType === SuperType.ENERGY);
      effect.damage = 50 * energies.length;
    }

    // Tyranical Crush
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          {},
          { allowCancel: false, min: 1, max: 1, isSecret: true },
        ),
        (cards) => {
          cards = cards || [];

          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
        },
      );
    }

    return state;
  }
}
