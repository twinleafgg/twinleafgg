import { ChooseCardsPrompt, EnergyCard, GameError, GameMessage, StateUtils } from '../../../game';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class LadyOuting extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Lady Outing';
  public fullName: string = 'Lady Outing RS';

  public text: string =
    'Search your deck for up to 3 different types of basic Energy cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      const uniqueBasicEnergies = Math.min(
        3,
        player.deck.cards
          .filter((c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC)
          .map((e) => (e as EnergyCard).provides[0])
          .filter((value, index, self) => self.indexOf(value) === index).length,
      );

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: uniqueBasicEnergies, allowCancel: false, differentTypes: true },
        ),
        (selected) => {
          if (selected.length > 1) {
            if (selected[0].name === selected[1].name) {
              throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
            }
          }
          if (selected.length === 0) {
            return state;
          }

          SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: selected, sourceCard: this });
        },
      );

      return state;
    }

    return state;
  }
}
