import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  SlotType,
  StateUtils,
  ChoosePokemonPrompt,
  GameMessage,
} from '../../../game';

import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { OPPONENT_CANNOT_PLAY_ITEM_CARDS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class SeismitoadEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 180;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Quaking Punch',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 30,
      text:
        "Your opponent can't play any Item cards from his or her hand " +
        'during his or her next turn.',
    },
    {
      name: 'Grenade Hammer',
      cost: [CardType.WATER, CardType.WATER, CardType.COLORLESS],
      damage: 130,
      text:
        'This attack does 30 damage to 2 of your Benched Pokemon. ' +
        "(Don't apply Weakness and Resistance for Benched Pokemon.)",
    },
  ];

  public set: string = 'FFI';

  public name: string = 'Seismitoad-EX';

  public fullName: string = 'Seismitoad EX FFI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '20';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      OPPONENT_CANNOT_PLAY_ITEM_CARDS(store, state, effect, this);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const benched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);

      if (benched === 0) {
        return state;
      }

      const max = Math.min(2, benched);

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: max, max, allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          targets.forEach((target) => {
            const damageEffect = new PutDamageEffect(effect, 30);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          });
        },
      );
    }

    return state;
  }
}
