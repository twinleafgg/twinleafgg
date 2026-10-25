import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Claydol extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Baltoy';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Antique Magic',
    cost: [C, C],
    damage: 0,
    text: 'Put 3 damage counters on any Pokémon (both yours and your opponent\'s) in any way you like.'
  }, {
    name: 'Synchro Attack',
    cost: [P, P],
    damage: 30,
    text: 'If the Defending Pokémon has the same remaining HP as Claydol, this attack\'s base damage is 90 instead of 30.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Claydol';
  public fullName: string = 'Claydol SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Antique Magic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const putOnce = (remaining: number) => {
        if (remaining <= 0) {
          return;
        }
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.ANY,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          if (selected && selected.length > 0) {
            const counters = new PutCountersEffect(effect, 10);
            counters.target = selected[0];
            store.reduceEffect(state, counters);
            putOnce(remaining - 1);
          }
        });
      };
      putOnce(3);
    }

    // Synchro Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const checkThis = new CheckHpEffect(player, player.active);
      store.reduceEffect(state, checkThis);
      const checkDefending = new CheckHpEffect(opponent, opponent.active);
      store.reduceEffect(state, checkDefending);
      if (checkThis.hp - player.active.damage === checkDefending.hp - opponent.active.damage) {
        effect.damage = 90;
      }
    }

    return state;
  }
}
