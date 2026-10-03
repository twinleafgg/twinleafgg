import { PokemonCard, Stage, CardType, StoreLike, State, EnergyCard } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from "../../../game/store/prefabs/attack-effects";
import {WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

/** #51 — Lightning Crash */
export class Pikachu51 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C, C];
  public attacks = [{
    name: 'Lightning Crash',
    cost: [L, L, L],
    damage: 0,
    text: 'Discard all [L] Energy from this Pokémon, and this attack does 90 damage to 1 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];
  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Pikachu';
  public fullName: string = 'Pikachu 30C 51';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lightning Crash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const cards = player.active.cards.filter(
        c => c instanceof EnergyCard && c.provides.includes(CardType.LIGHTNING),
      );
      cards.forEach(c => { MOVE_CARDS(store, state, player.active, player.discard, { cards: [c], sourceCard: this }); });
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(90, effect, store, state);
    }
    return state;
  }
}
