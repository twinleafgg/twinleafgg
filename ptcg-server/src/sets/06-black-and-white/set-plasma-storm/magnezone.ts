import { PokemonCard, CardTag, Stage, CardType, PowerType, StoreLike, State, TrainerType, PlayerType, StateUtils } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { AfterAttackEffect, EndTurnEffect } from "../../../game/store/effects/game-phase-effects";
import { TrainerEffect } from "../../../game/store/effects/play-card-effects";
import { IS_ABILITY_BLOCKED, SWITCH_ACTIVE_WITH_BENCHED } from "../../../game/store/prefabs/prefabs";

export class Magnezone extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Magneton';
  public cardType: CardType[] = [L];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Dual Brains',
    powerType: PowerType.ABILITY,
    text: 'During your turn, you may play 2 Supporter cards.',
  }];

  public attacks = [{
    name: 'Gyro Ball',
    cost: [L, L, C],
    damage: 80,
    text: 'Switch this Pokémon with 1 of your Benched Pokémon. Then, your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.',
  }];

  public set: string = 'PLS';
  public setNumber: string = '46';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Magnezone';
  public fullName: string = 'Magnezone PLS';

  public usedDualBrains = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dual Brains
    if (effect instanceof TrainerEffect && effect.trainerCard.trainerType === TrainerType.SUPPORTER) {
      const player = effect.player;

      // Check if Magnezone is in play for this player
      let inPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.getPokemonCard() === this) {
          inPlay = true;
        }
      });

      if (!inPlay) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (this.usedDualBrains) {
        return state;
      }

      if (player.supporterTurn === 0) {
        player.supporterTurn = -1;
        this.usedDualBrains = true;
      }
    }

    // Gyro Ball
    if (effect instanceof AfterAttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.bench.some((b) => b.cards.length > 0)) {
        SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
      }

      if (opponent.bench.some((b) => b.cards.length > 0)) {
        SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);
      }
    }

    if (effect instanceof EndTurnEffect) {
      this.usedDualBrains = false;
    }

    return state;
  }
}
