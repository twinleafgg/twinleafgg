import {
  AttachEnergyPrompt,
  ChooseCardsPrompt,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  CONFIRMATION_PROMPT,
  MOVE_CARDS,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

function* useEnergyRecycle(
  next: Function,
  store: StoreLike,
  state: State,
  effect: PowerEffect,
): IterableIterator<State> {
  const player = effect.player;

  BLOCK_IF_HAS_SPECIAL_CONDITION(player, effect.card);

  yield store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_TO_BENCH,
      player.discard,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH, SlotType.ACTIVE],
      { superType: SuperType.ENERGY },
      { allowCancel: false, min: 0, max: 3 },
    ),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: effect.card });
        next();
      }
    },
  );

  const endTurnEffect = new EndTurnEffect(player);
  store.reduceEffect(state, endTurnEffect);
  return state;
}

export class Swampertex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  protected _tags = [CardTag.POKEMON_ex];
  public evolvesFrom = 'Marshtomp';
  public cardType: CardType[] = [W];
  public hp: number = 150;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Energy Recycle',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may search your discard pile for 3 Energy cards and attach them to your Pokémon in any way you like. If you do, your turn ends. This power can't be used if Swampert ex is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Ultra Pump',
      cost: [W, C, C],
      damage: 60,
      damageCalculation: '+',
      text: "You may discard 2 cards from your hand. If you do, this attack does 60 damage plus 20 more damage and does 20 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'CG';
  public name: string = 'Swampert ex';
  public fullName: string = 'Swampert ex CG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '98';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.hand.cards.length < 2) {
        return state;
      }

      CONFIRMATION_PROMPT(
        store,
        state,
        player,
        (result) => {
          if (result) {
            state = store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DISCARD,
                player.hand,
                {},
                { allowCancel: true, min: 2, max: 2 },
              ),
              (cards) => {
                cards = cards || [];
                if (cards.length === 0) {
                  return;
                }
                MOVE_CARDS(store, state, player.hand, player.discard, {
                  cards,
                  sourceEffect: this.attacks[0],
                });

                effect.damage += 20;
                THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(
                  20,
                  effect,
                  store,
                  state,
                );
              },
            );
          }
        },
        GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK,
      );

      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useEnergyRecycle(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
