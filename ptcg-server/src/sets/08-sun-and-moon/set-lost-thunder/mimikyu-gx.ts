import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  PlayerType,
  SlotType,
  GameError,
  ChoosePokemonPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SpecialCondition } from '../../../game/store/card/card-types';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';

import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';

export class MimikyuGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FAIRY];

  public hp: number = 170;

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Perplex',
      cost: [CardType.FAIRY],
      damage: 0,
      text: "Your opponent's Active Pokémon is now Confused.",
    },
    {
      name: "Let's Snuggle and Fall",
      cost: [CardType.FAIRY, CardType.COLORLESS],
      damage: 10,
      text: "This attack does 30 more damage for each damage counter on your opponent's Active Pokémon.",
    },
    {
      name: 'Dream Fear-GX',
      cost: [CardType.FAIRY],
      damage: 0,
      text: "Choose 1 of your opponent's Benched Pokémon. Your opponent shuffles that Pokémon and all cards attached to it into their deck. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'LOT';

  public setNumber = '149';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Mimikyu-GX';

  public fullName: string = 'Mimikyu-GX LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Perplex
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.CONFUSED]);
      return store.reduceEffect(state, specialCondition);
    }

    // Let's Snuggle and Fall
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      effect.damage += opponent.active.damage * 3;
    }

    // Dream Fear-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ),
        (selection) => {
          selection.forEach((r) => {
            MOVE_POKEMON_OFF_BOARD(store, state, r, {
              pokemonDestination: opponent.deck,
              sourceCard: this,
            });
          });

          store.prompt(state, new ShuffleDeckPrompt(opponent.id), (order) => {
            opponent.deck.applyOrder(order);
          });
        },
      );
    }

    return state;
  }
}
