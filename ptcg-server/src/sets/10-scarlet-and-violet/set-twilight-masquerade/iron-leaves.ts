import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import {WAS_ATTACK_USED,
  WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class IronLeaves extends PokemonCard {
  protected _tags = [CardTag.FUTURE];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Recovery Net',
      cost: [G],
      damage: 0,
      text: 'Choose up to 2 Pokémon from your discard pile, reveal them, and put them into your hand.',
    },
    {
      name: 'Avenging Edge',
      cost: [G, C, C],
      damage: 100,
      damageCalculation: '+',
      text: "If any of your Pokémon were Knocked Out by damage from an attack during your opponent's last turn, this attack does 60 more damage.",
    },
  ];

  public regulationMark = 'H';
  public set: string = 'TWM';
  public name: string = 'Iron Leaves';
  public fullName: string = 'Iron Leaves TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Recovery Net
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const pokemonCount = player.discard.cards.filter((c) => {
        return c instanceof PokemonCard;
      }).length;

      if (pokemonCount === 0) {
        return state;
      }

      const max = Math.min(2, pokemonCount);

      return store.prompt(
        state,
        [
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            { superType: SuperType.POKEMON },
            { min: 1, max, allowCancel: false },
          ),
        ],
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        },
      );
    }

    // Avenging Edge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (
        WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(effect.player, { byAttackDamage: true })
      ) {
        effect.damage += 60;
      }
    }

    return state;
  }
}
