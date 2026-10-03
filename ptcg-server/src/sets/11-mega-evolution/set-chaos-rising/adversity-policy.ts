import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class AdversityPolicy extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Adversity Policy';
  public fullName: string = 'Adversity Policy CRI';
  public text: string =
    "If the Pokémon this card is attached to has Weakness to your opponent's Active Pokémon's type, is in the Active Spot, and is damaged by an attack from your opponent's Pokémon (even if this Pokémon is Knocked Out), draw 3 cards.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AfterDamageEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      const attachedPokemon = effect.target.getPokemonCard();
      if (attachedPokemon === undefined) {
        return state;
      }

      const checkOpponentType = new CheckPokemonTypeEffect(player.active);
      store.reduceEffect(state, checkOpponentType);
      const opponentTypes = checkOpponentType.cardTypes;

      const hasWeaknessToOpponentActiveType = attachedPokemon.weakness.some((w) =>
        opponentTypes.includes(w.type),
      );
      if (!hasWeaknessToOpponentActiveType) {
        return state;
      }
      MOVE_CARDS(store, state, targetPlayer.deck, targetPlayer.hand, { count: 3, sourceCard: this });
    }

    return state;
  }
}
