import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, BoardEffect } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  ChoosePokemonPrompt,
  ConfirmPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {AFTER_ATTACK,
  BLOCK_IF_GX_ATTACK_USED,
  CONFIRMATION_PROMPT,
  IS_ABILITY_BLOCKED,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

// FLI Greninja-GX 24 (https://limitlesstcg.com/cards/FLI/24)
export class GreninjaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Frogadier';

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 230;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Shuriken Flurry',
      useWhenInPlay: false,
      powerType: PowerType.ABILITY,
      text: "When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may put 3 damage counters on 1 of your opponent's Pokémon.",
    },
  ];

  public attacks = [
    {
      name: 'Haze Slash',
      cost: [CardType.WATER, CardType.COLORLESS, CardType.COLORLESS],
      damage: 110,
      text: 'You may shuffle this Pokémon and all cards attached to it into your deck. ',
    },

    {
      name: 'Shadowy Hunter-GX',
      cost: [CardType.WATER, CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      gxAttack: true,
      text: "This attack does 130 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.) (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'FLI';

  public name: string = 'Greninja-GX';

  public fullName: string = 'Greninja-GX FLI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '24';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shuriken Flurry
    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            return store.prompt(
              state,
              new ChoosePokemonPrompt(
                player.id,
                GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
                PlayerType.TOP_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                { allowCancel: false },
              ),
              (targets) => {
                if (!targets || targets.length === 0) {
                  return;
                }

                player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                  if (cardList.getPokemonCard() === this) {
                    cardList.addBoardEffect(BoardEffect.ABILITY_USED);
                  }
                });

                targets.forEach((target) => {
                  target.damage += 30;
                });
              },
            );
          }
        },
      );
    }

    // Haze Slash
    if (AFTER_ATTACK(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, () => {
        const player = effect.player;
        player.active.clearEffects();
        MOVE_CARDS(store, state, player.active, player.deck, { sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
        });
      });
    }

    // Shadowy Hunter-GX
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
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }
          const damageEffect = new PutDamageEffect(effect, 130);
          damageEffect.target = targets[0];
          store.reduceEffect(state, damageEffect);
        },
      );
    }
    return state;
  }
}
