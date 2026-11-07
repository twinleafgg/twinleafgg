import { CardType, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Throh extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 130;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Circle Throw',
    cost: [F],
    damage: 20,
    text: 'Switch your opponent\'s Active Pokémon with 1 of their Benched Pokémon. (Your opponent chooses the Pokémon to switch in.)'
  },
  {
    name: 'Guts Fight',
    cost: [C, C, C],
    damage: 110,
    text: 'This Pokémon also does 20 damage to itself.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Throh';
  public fullName: string = 'Throh FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Circle Throw
    // Ref: set-team-up/pidgeot.ts (Whirlwind - opponent chooses the new Active)
    if (effect instanceof AfterAttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (!opponent.bench.some(b => b.cards.length > 0)) {
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        opponent.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        opponent.switchPokemon(targets[0], store, state);
      });
    }

    // Guts Fight
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 20);
    }

    return state;
  }
}
