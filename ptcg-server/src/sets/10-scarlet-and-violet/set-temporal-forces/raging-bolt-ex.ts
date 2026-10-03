import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameError, SlotType } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { DISCARD_UP_TO_X_ENERGY_FROM_YOUR_POKEMON } from '../../../game/store/prefabs/costs';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RagingBoltex extends PokemonCard {
  public regulationMark = 'H';

  protected _tags = [CardTag.POKEMON_ex, CardTag.ANCIENT];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 240;

  public weakness = [];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Burst Roar',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Discard your hand and draw 6 cards.',
    },
    {
      name: 'Bellowing Thunder',
      cost: [CardType.LIGHTNING, CardType.FIGHTING],
      damage: 70,
      damageCalculation: 'x',
      text: 'You may discard any amount of Basic Energy from your Pokémon. This attack does 70 damage for each card you discarded in this way.',
    },
  ];

  public set: string = 'TEF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '123';

  public name: string = 'Raging Bolt ex';

  public fullName: string = 'Raging Bolt ex TEF';

  // Implement power
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      MOVE_CARDS(store, state, player.hand, player.discard, { sourceCard: this });
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 6, sourceCard: this });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = 0;

      // Legacy implementation:
      // - Counted Basic Energy across Active + Bench manually.
      // - Used DiscardEnergyPrompt and moved selected cards by hand.
      // - Set damage to discardedCount * 70.
      //
      // Converted to prefab version (DISCARD_UP_TO_X_ENERGY_FROM_YOUR_POKEMON).
      return DISCARD_UP_TO_X_ENERGY_FROM_YOUR_POKEMON(
        store,
        state,
        effect,
        Number.MAX_SAFE_INTEGER,
        { energyType: EnergyType.BASIC },
        0,
        [SlotType.ACTIVE, SlotType.BENCH],
        (transfers) => {
          effect.damage = transfers.length * 70;
        },
      );
    }
    return state;
  }
}
