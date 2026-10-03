import {
  AttachEnergyPrompt,
  CardList,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  ShowCardsPrompt,
  SlotType,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
} from '../../../game';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ether extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'PLS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '121';

  public name: string = 'Ether';

  public fullName: string = 'Ether PLS';

  public text =
    'Reveal the top card of your deck. If that card is a basic Energy card, attach it to 1 of your Pokémon. If it is not a basic Energy card, return it to the top of your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const temp = new CardList();

      MOVE_CARDS(store, state, player.deck, temp, { count: 1, sourceCard: this });

      store.prompt(
        state,
        new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, temp.cards),
        () => state,
      );

      // Check if any cards drawn are basic energy
      const isEnergy =
        temp.cards[0] instanceof EnergyCard && temp.cards[0].energyType === EnergyType.BASIC;

      if (isEnergy) {
        // Prompt to attach energy if any were drawn
        return store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_CARDS,
            temp, // Only show drawn energies
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH, SlotType.ACTIVE],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { min: 1, max: 1 },
          ),
          (transfers) => {
            // Attach energy based on prompt selection
            if (transfers) {
              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, temp, target, {
                  cards: [transfer.card],
                  sourceCard: this,
                }); // Move card to target
              }
            }

            return state;
          },
        );
      } else {
        temp.moveToTopOfDestination(player.deck);
      }

      return state;
    }
    return state;
  }
}
