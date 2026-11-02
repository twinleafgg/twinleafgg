import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutCountersEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Swalot extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gulpin';
  public hp: number = 100;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Damage Roller',
    cost: [P],
    damage: 0,
    text: 'Put damage counters on the Defending Pokémon until the Defending Pokémon has the same remaining HP as Swalot. (If the Defending Pokémon has the same or less remaining HP as Swalot, this attack does nothing.)'
  }, {
    name: 'Entangle Tackle',
    cost: [P, P, C],
    damage: 50,
    damageCalculation: '+',
    text: 'You may do 50 damage plus 30 more damage. If you do, this attack does 30 damage to 1 of your Pokémon, and don\'t apply Weakness and Resistance to this damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Swalot';
  public fullName: string = 'Swalot AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Damage Roller
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const checkSwalot = new CheckHpEffect(player, player.active);
      store.reduceEffect(state, checkSwalot);
      const checkDefending = new CheckHpEffect(opponent, opponent.active);
      store.reduceEffect(state, checkDefending);
      const swalotRemaining = checkSwalot.hp - player.active.damage;
      const defendingRemaining = checkDefending.hp - opponent.active.damage;
      if (defendingRemaining <= swalotRemaining) {
        return state;
      }
      const damageEffect = new PutCountersEffect(effect, defendingRemaining - swalotRemaining);
      damageEffect.target = opponent.active;
      store.reduceEffect(state, damageEffect);
    }

    // Entangle Tackle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (!result) {
          return;
        }
        effect.damage += 30;
        store.prompt(state, new ChoosePokemonPrompt(
          effect.player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (!targets || targets.length === 0) {
            return;
          }
          const damageEffect = new PutDamageEffect(effect, 30);
          damageEffect.target = targets[0];
          store.reduceEffect(state, damageEffect);
        });
      });
    }

    return state;
  }
}
