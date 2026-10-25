import { CardTag, CardTarget, CardType, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class MrMimeE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Magic Heal',
    cost: [],
    damage: 0,
    text: 'Flip 3 coins. Remove a number of damage counters equal to the number of heads from your Pokémon in any way you like.'
  },
  {
    name: 'Barrier Attack',
    cost: [P, C],
    damage: 30,
    text: 'During your opponent\'s next turn, any damage done to Mr. Mime E4 by attacks is reduced by 10 (after applying Weakness and Resistance).'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public name: string = 'Mr. Mime E4';
  public fullName: string = 'Mr. Mime E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magic Heal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        const heads = results.filter(r => r).length;
        const healOnce = (remaining: number) => {
          if (remaining <= 0) {
            return;
          }
          const blocked: CardTarget[] = [];
          let hasDamaged = false;
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
            if (list.damage === 0) {
              blocked.push(target);
            } else {
              hasDamaged = true;
            }
          });
          if (!hasDamaged) {
            return;
          }
          store.prompt(state, new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_HEAL,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { min: 1, max: 1, allowCancel: false, blocked }
          ), selected => {
            if (selected && selected.length > 0) {
              store.reduceEffect(state, new HealEffect(player, selected[0], 10));
              healOnce(remaining - 1);
            }
          });
        };
        healOnce(heads);
      });
    }

    // Barrier Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 10);
    }

    return state;
  }
}
