import { PokemonCard, Stage, CardTag, CardType, PowerType, StoreLike, State, GameError, GameMessage } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { AttackEffect } from "../../../game/store/effects/game-effects";
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF } from "../../../game/store/prefabs/prefabs";

export class MegaGolurkex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Golett';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 350;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C, C];

  public powers = [{
      name: 'Restricted Activation',
      powerType: PowerType.ABILITY,
      text: "This Pokémon can't use attacks unless you have 10 or more cards in your hand.",
    }];

  public attacks = [{
      name: 'Goliath\'s Punch',
      cost: [P, P],
      damage: 300,
      text: 'This Pokémon also does 30 damage to itself.',
    }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '47';
  public name: string = 'Mega Golurk ex';
  public fullName: string = 'Mega Golurk ex M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Power Limiter
    if (effect instanceof AttackEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player.hand.cards.length < 10) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
    }

    // Goliath Punch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 30);
    }

    return state;
  }
}
