import { PokemonCard, Stage, CardTag, CardType, PowerType, StoreLike, State, GameError, GameMessage, StateUtils, PokemonCardList } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { HealEffect } from "../../../game/store/effects/game-effects";
import { WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN } from "../../../game/store/prefabs/prefabs";

export class Wishiwashiex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [W];
  public hp: number = 260;
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [{
      name: 'Ocean Gain',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. Heal 50 damage from this Pokémon.',
    }];

  public attacks = [{
      name: 'Hydro Splash',
      cost: [W, W, W, C],
      damage: 220,
      text: '',
    }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '29';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Wishiwashi ex';
  public fullName: string = 'Wishiwashi ex M6';

  public readonly OCEAN_GAIN_MARKER = 'WISHIWASHI_EX_M6_OCEAN_GAIN_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ocean Gain
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      if (cardList !== player.active) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (cardList.damage === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.OCEAN_GAIN_MARKER, this);
      ABILITY_USED(player, this);

      const healEffect = new HealEffect(player, cardList, 50);
      store.reduceEffect(state, healEffect);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.OCEAN_GAIN_MARKER, this);

    return state;
  }
}
