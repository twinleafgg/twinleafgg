import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ABILITY_USED, ADD_MARKER, COIN_FLIP_PROMPT, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_POKEMON_OFF_BOARD, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class FanRotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Fan Shift',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may use this power. Fan Rotom\'s type is Colorless until the end of your turn.'
  }];

  public attacks = [{
    name: 'Spin Storm',
    cost: [C, C],
    damage: 0,
    text: 'Flip a coin. If heads, your opponent returns the Defending Pokémon and all cards attached to it to his or her hand.'
  }, {
    name: 'Air Slash',
    cost: [C, C, C],
    damage: 60,
    text: 'Flip a coin. If tails, discard an Energy attached to Fan Rotom.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'RT1';
  public name: string = 'Fan Rotom';
  public fullName: string = 'Fan Rotom RR';

  public readonly FAN_SHIFT_MARKER = 'FAN_SHIFT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FAN_SHIFT_MARKER, this);

    // Fan Shift
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.FAN_SHIFT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      ABILITY_USED(player, this);
      ADD_MARKER(this.FAN_SHIFT_MARKER, player, this);
    }

    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (HAS_MARKER(this.FAN_SHIFT_MARKER, player, this)) {
        effect.cardTypes = [CardType.COLORLESS];
      }
    }

    // Spin Storm
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          MOVE_POKEMON_OFF_BOARD(store, state, opponent.active, {
            pokemonDestination: opponent.hand,
            sourceCard: this,
          });
        }
      });
    }

    // Air Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
        }
      });
    }

    return state;
  }
}
