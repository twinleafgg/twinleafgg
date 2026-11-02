import { CardTag, CardType, PokemonCard, PowerType, Stage, State, StoreLike, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class MamoswineGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 100;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Icy Aura',
    powerType: PowerType.POKEBODY,
    text: 'As long as Mamoswine GL is your Active Pokémon, put 1 damage counter on each Active Pokémon (excluding Water Pokémon) (both yours and your opponent\'s) between turns.'
  }];

  public attacks = [{
    name: 'Avalanche',
    cost: [W, W, C, C],
    damage: 60,
    text: 'Flip a coin. If heads, this attack does 10 damage to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Mamoswine GL';
  public fullName: string = 'Mamoswine GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Icy Aura
    if (effect instanceof BetweenTurnsEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      for (const p of state.players) {
        const activeCard = p.active.getPokemonCard();
        if (activeCard && !pokemonHasCardType(activeCard, W)) {
          store.reduceEffect(state, new PlaceDamageCountersEffect(player, p.active, 10, this, this.powers[0]));
        }
      }
    }

    // Avalanche
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, true);
        }
      });
    }

    return state;
  }
}
