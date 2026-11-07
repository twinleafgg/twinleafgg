import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, StateUtils, PlayerType, CardTag } from "../../../game";
import { CheckRetreatCostEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { IS_ABILITY_BLOCKED } from "../../../game/store/prefabs/prefabs";

export class Wimpod extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public powers = [{
      name: 'Punk Out',
      powerType: PowerType.ABILITY,
      text: "If your opponent has any Pokémon ex in play, this Pokémon has no Retreat Cost.",
    }];

  public attacks = [{
      name: 'Ram',
      cost: [G],
      damage: 10,
      text: '',
    }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '10';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Wimpod';
  public fullName: string = 'Wimpod M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Punk Out
    if (
      effect instanceof CheckRetreatCostEffect &&
      effect.player.active.getPokemonCard() === this
    ) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);
      let hasPokemonEx = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_cardList, card) => {
        if (card.hasTag(CardTag.POKEMON_ex)) {
          hasPokemonEx = true;
        }
      });

      if (hasPokemonEx) {
        effect.cost = [];
      }
    }

    return state;
  }
}
