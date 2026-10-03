import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SpecialCondition } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {BLOCK_IF_GX_ATTACK_USED,
  SWITCH_IN_OPPONENT_BENCHED_POKEMON,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TsareenaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Steenee';
  public cardType: CardType[] = [G];
  public hp: number = 230;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'G Side Eye',
      cost: [G],
      damage: 0,
      text: "Switch 1 of your opponent's Benched Pokémon with their Active Pokémon. The new Active Pokémon is now Confused.",
    },
    {
      name: 'Jumping Side Kick',
      cost: [G, C, C],
      damage: 90,
      damageCalculation: '+',
      text: "If your opponent's Active Pokémon is Confused, this attack does 90 more damage.",
    },
    {
      name: "Queen's Command-GX",
      cost: [G, G, C],
      damage: 0,
      gxAttack: true,
      text: "Your opponent discards 4 cards from their hand. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'SMP';
  public setNumber = '56';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Tsareena-GX';
  public fullName: string = 'Tsareena-GX SMP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, player, {
        allowCancel: false,
        onSwitched: () => {
          opponent.active.addSpecialCondition(SpecialCondition.CONFUSED);
        },
      });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      if (opponent.active.specialConditions.includes(SpecialCondition.CONFUSED)) {
        effect.damage += 90;
      }
      return state;
    }

    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const opponent = StateUtils.getOpponent(state, player);
      const n = Math.min(4, opponent.hand.cards.length);
      if (n === 0) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          opponent,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          {},
          { min: n, max: n, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
        },
      );
    }

    return state;
  }
}
