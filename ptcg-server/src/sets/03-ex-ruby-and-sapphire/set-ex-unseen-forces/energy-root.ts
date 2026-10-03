import { TrainerCard, TrainerType, State, StoreLike, StateUtils } from '../../../game';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { GameMessage } from '../../../game/game-message';
import {
  HANDLE_ABILITY_BLOCK,
  POKEPOWER_AND_BODY_TYPES,
} from '../../../game/store/prefabs/ability-lock';

export class EnergyRoot extends TrainerCard {
  protected _trainerType = TrainerType.TOOL;
  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Energy Root';
  public fullName: string = 'Energy Root UF';

  public text: string =
    "As long as Energy Root is attached to a Pokémon, that Pokémon gets +20 HP and can't use any Poké-Powers or Poké-Bodies.";

  private readonly HP_BONUS = 20;

  public reduceEffect(store: StoreLike, state: State, effect: Effect) {
    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this)) {
      const card = effect.target.getPokemonCard();

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (card === undefined) {
        return state;
      }

      effect.hp += this.HP_BONUS;
    }

    HANDLE_ABILITY_BLOCK(
      effect,
      ({ card }) => {
        let cardList: PokemonCardList | undefined;
        if (card instanceof PokemonCardList) {
          cardList = card;
        } else if (card instanceof PokemonCard) {
          try {
            const found = StateUtils.findCardList(state, card);
            if (found instanceof PokemonCardList) {
              cardList = found;
            }
          } catch {
            return false;
          }
        }
        if (!cardList || !cardList.tools.includes(this)) {
          return false;
        }
        const owner = StateUtils.findOwner(state, cardList);
        return !IS_TOOL_BLOCKED(store, state, owner, this);
      },
      {
        powerTypes: POKEPOWER_AND_BODY_TYPES,
        error: GameMessage.BLOCKED_BY_EFFECT,
      },
    );

    return state;
  }
}
