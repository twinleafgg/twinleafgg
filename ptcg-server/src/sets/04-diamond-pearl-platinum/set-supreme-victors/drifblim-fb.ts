import { ChoosePokemonPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class DrifblimFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Pump Up',
    powerType: PowerType.POKEBODY,
    text: 'If your opponent has 3 or less Prize cards left, Drifblim FB gets +40 HP.'
  }];

  public attacks = [{
    name: 'Shadow Ball',
    cost: [P, C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Benched Pokémon. This attack does 40 damage to that Pokémon. Apply Weakness and Resistance.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Drifblim FB';
  public fullName: string = 'Drifblim FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Pump Up
    if (effect instanceof CheckHpEffect && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, owner);
      if (opponent.getPrizeLeft() <= 3) {
        effect.hp += 40;
      }
    }

    // Shadow Ball
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      if (!opponent.bench.some(b => b.cards.length > 0)) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false },
      ), selected => {
        if (!selected || selected.length === 0) {
          return;
        }
        const damageEffect = new DealDamageEffect(effect, 40);
        damageEffect.target = selected[0];
        store.reduceEffect(state, damageEffect);
      });
    }

    return state;
  }
}
