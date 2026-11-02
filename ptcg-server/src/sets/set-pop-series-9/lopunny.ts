import { PokemonCard, Stage, CardType, StoreLike, State, GameMessage, StateUtils, PlayerType, SlotType, ChoosePokemonPrompt } from '../../game';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Lopunny extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Buneary';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: 20 }];
  public retreat = [C];

  public attacks = [{
    // Jump Kick
    name: 'Jump Kick',
    cost: [C, C],
    damage: 20,
    text: 'Does 20 damage to 1 of your opponent\'s Benched Pokemon. (Don\'t apply Weakness and Resistance for Benched Pokemon.)'
  }, {
    // Jazzed
    name: 'Jazzed',
    cost: [C, C, C],
    damage: 50,
    text: 'If Lopunny evolved from Buneary during this turn, remove all damage counters from Lopunny.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Lopunny';
  public fullName: string = 'Lopunny OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false }
      ), targets => {
        targets.forEach(target => {
          const dealDamage = new PutDamageEffect(effect, 20);
          dealDamage.target = target;
          return store.reduceEffect(state, dealDamage);
        });
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (player.active.pokemonPlayedTurn === state.turn) {
        player.active.damage = 0;
      }
    }
    return state;
  }
}
