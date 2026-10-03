import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  PlayerType,
  SlotType,
  GameError,
  ChoosePokemonPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { Player } from '../../../game/store/state/player';
import {
  BLOCK_IF_GX_ATTACK_USED,
  MOVE_CARDS,
  MOVE_POKEMON_OFF_BOARD,
  PLAY_POKEMON_FROM_HAND_TO_BENCH,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class GreninjaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Frogadier';

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 230;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Elusive Master',
      powerType: PowerType.ABILITY,
      useFromHand: true,
      useFromHandToBench: true,
      text: 'Once during your turn (before your attack), if this Pokémon is the last card in your hand, you may play it onto your Bench. If you do, draw 3 cards.',
    },
  ];

  public attacks = [
    {
      name: 'Mist Slash',
      cost: [CardType.WATER, CardType.COLORLESS],
      damage: 130,
      text: "This attack's damage isn't affected by Weakness, Resistance, or any other effects on your opponent's Active Pokémon.",
    },

    {
      name: 'Dark Mist-GX',
      cost: [CardType.WATER],
      damage: 0,
      text: "Put 1 of your opponent's Benched Pokémon and all cards attached to it into your opponent's hand. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'SMP';

  public setNumber = '197';

  public cardImage: string = 'assets/cardback.png';

  public name: string = 'Greninja-GX';

  public fullName: string = 'Greninja-GX SMP';

  public canUseFromHandToBench(_store: StoreLike, _state: State, player: Player): boolean {
    return player.hand.cards.filter((c) => c !== this).length === 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Elusive Master
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (!this.canUseFromHandToBench(store, state, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      PLAY_POKEMON_FROM_HAND_TO_BENCH(state, player, this, effect.target);
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
    }

    // Mist Slash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (effect.damage > 0) {
        opponent.active.damage += effect.damage;
        const afterDamage = new AfterDamageEffect(effect, effect.damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }

    // Dark Mist-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
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
        (result) => {
          const cardList = result.length > 0 ? result[0] : null;
          if (cardList !== null) {
            MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
              pokemonDestination: opponent.hand,
              sourceCard: this,
            });
          }
        },
      );
    }
    return state;
  }
}
