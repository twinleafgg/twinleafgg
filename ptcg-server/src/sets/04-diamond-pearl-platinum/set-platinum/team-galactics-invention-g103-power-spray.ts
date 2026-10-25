import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { CONFIRMATION_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class TeamGalacticsInventionG103PowerSpray extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '117';
  public name: string = 'Team Galactic\'s Invention G-103 Power Spray';
  public fullName: string = 'Team Galactic\'s Invention G-103 Power Spray PL';
  public text: string = 'You may play this card during your opponent\'s turn when your opponent\'s Pokémon uses any Poké-Power. Prevent all effects of that Poké-Power. (This counts as that Pokémon using its Poké-Power.) If you have 2 or less Pokémon SP in play, you can\'t play this card.';

  public canPlay(): boolean {
    return false;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    if (effect instanceof PowerEffect && effect.power.powerType === PowerType.POKEPOWER) {
      if (!effect.card.powers.includes(effect.power)) {
        return state;
      }

      const powerUser = effect.player;
      const sprayOwner = StateUtils.getOpponent(state, powerUser);
      if (!sprayOwner.hand.cards.includes(this)) {
        return state;
      }

      const firstSpray = sprayOwner.hand.cards.find(c => c.name === this.name);
      if (firstSpray !== this) {
        return state;
      }

      let spCount = 0;
      sprayOwner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card.hasTag(CardTag.POKEMON_SP)) {
          spCount += 1;
        }
      });
      if (spCount < 3) {
        return state;
      }

      return CONFIRMATION_PROMPT(store, state, sprayOwner, confirmed => {
        if (!confirmed) {
          return;
        }
        MOVE_CARDS(store, state, sprayOwner.hand, sprayOwner.discard, { cards: [this], sourceCard: this });
        effect.preventDefault = true;
      });
    }

    return state;
  }
}
