import { CardType, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { AfterDamageEffect, ApplyWeaknessEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ninjask extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nincada';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Circling Dive',
    cost: [C],
    damage: 0,
    text: 'This attack does 10 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Switch Ninjask with 1 of your Benched Pokémon.'
  }, {
    name: 'Parallel Drain',
    cost: [G],
    damage: 30,
    text: 'Remove from 1 of your Pokémon the number of damage counters equal to the damage you did to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Ninjask';
  public fullName: string = 'Ninjask SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Circling Dive
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        let kickDamage = 10;
        if (cardList === opponent.active) {
          const applyWeakness = new ApplyWeaknessEffect(effect, kickDamage);
          store.reduceEffect(state, applyWeakness);
          kickDamage = applyWeakness.damage;
        }
        const damageEffect = new PutDamageEffect(effect, kickDamage);
        damageEffect.target = cardList;
        store.reduceEffect(state, damageEffect);
      });
      SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
    }

    // Parallel Drain
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[1]
      && effect.damage > 0 && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      const healAmount = effect.damage;
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_HEAL,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        if (targets.length > 0) {
          store.reduceEffect(state, new HealEffect(player, targets[0], healAmount));
        }
      });
    }

    return state;
  }
}
