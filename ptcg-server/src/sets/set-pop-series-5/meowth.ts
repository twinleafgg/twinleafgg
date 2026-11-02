import { PokemonCard, CardTag, CardType, Stage, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../game';
import { AfterDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Meowth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 40;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Feint Attack
    name: 'Feint Attack',
    cost: [D],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 10 damage to that Pokémon. This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on that Pokémon.'
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Meowth δ';
  public fullName: string = 'Meowth δ P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Feint Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.getPokemonInPlay().length === 0) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        target.damage += 10;
        const afterDamage = new AfterDamageEffect(effect, 10);
        afterDamage.target = target;
        store.reduceEffect(state, afterDamage);
      });
    }
    return state;
  }
}
