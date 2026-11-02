import { ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class DusknoirFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: D, value: +30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Ghost Hand',
    cost: [P, C],
    damage: 30,
    text: 'Put 1 damage counter on 1 of your Benched Pokémon.'
  }, {
    name: 'Cursed Wrath',
    cost: [P, C, C],
    damage: 10,
    damageCalculation: 'x',
    text: 'Does 10 damage times the number of Pokémon SP in your discard pile.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name: string = 'Dusknoir FB';
  public fullName: string = 'Dusknoir FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ghost Hand
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!player.bench.some(b => b.cards.length > 0)) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false },
      ), selected => {
        if (!selected || selected.length === 0) {
          return;
        }
        store.reduceEffect(state, new PlaceDamageCountersEffect(player, selected[0], 10, this));
      });
    }

    // Cursed Wrath
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const spCount = effect.player.discard.cards.filter(c =>
        c instanceof PokemonCard && c.hasTag(CardTag.POKEMON_SP)
      ).length;
      effect.damage = 10 * spCount;
    }

    return state;
  }
}
