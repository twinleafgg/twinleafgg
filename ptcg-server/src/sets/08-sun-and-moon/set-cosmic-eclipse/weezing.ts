import { CardType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { MOVE_POKEMON_OFF_BOARD, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { reduceBlowAwayBombEffect } from './blow-away-bomb';

export class Weezing extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Koffing';
  public cardType: CardType[] = [P];
  public hp: number = 100;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'Blow-Away Bomb',
    powerType: PowerType.ABILITY,
    useFromHand: true,
    text: 'Once during your turn, when you discard this Pokémon with the effect of Roxie, you may put 1 damage counter on each of your opponent\'s Pokémon. (Place damage counters after the effect of Roxie.)'
  }];

  public attacks = [{
    name: 'Balloon Burst',
    cost: [P, C],
    damage: 90,
    text: 'Discard this Pokémon and all cards attached to it.'
  }];

  public set: string = 'CEC';
  public setNumber: string = '77';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Weezing';
  public fullName: string = 'Weezing CEC';

  public usedBalloonBurst = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    state = reduceBlowAwayBombEffect(store, state, effect, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedBalloonBurst = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedBalloonBurst === true) {
      const player = effect.player;
      MOVE_POKEMON_OFF_BOARD(store, state, player.active, {
        pokemonDestination: player.discard,
        sourceCard: this,
      });
    }

    if (effect instanceof EndTurnEffect && this.usedBalloonBurst) {
      this.usedBalloonBurst = false;
    }

    return state;
  }
}