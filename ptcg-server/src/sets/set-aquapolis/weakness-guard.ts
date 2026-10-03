import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, StateUtils } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { CheckPokemonStatsEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class WeaknessGuard extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'AQ';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '141';
  public name: string = 'Weakness Guard';
  public fullName: string = 'Weakness Guard AQ';

  public text: string =
    "Attach this card to 1 of your Pokémon. Discard it at the end of your opponent's next turn.\n\nAs long as this card is attached, this Pokémon has no Weakness.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 1, allowCancel: false },
        ),
        (transfers) => {
          MOVE_CARDS(store, state, player.supporter, transfers[0], {
            cards: [effect.trainerCard],
            sourceCard: this,
          });
        },
      );
    }

    // Discard at end of opponent's turn
    if (effect instanceof EndTurnEffect) {
      const opponent = effect.player;
      const player = StateUtils.getOpponent(state, opponent);
      const cardList = StateUtils.findCardList(state, this);
      // Do nothing if the end turn effect is for this player (not opponent)
      if (effect.player === StateUtils.findOwner(state, cardList)) {
        return state;
      }

      player.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, index) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    // Actual effect
    if (effect instanceof CheckPokemonStatsEffect && effect.target.tools.includes(this)) {
      const target = effect.target.getPokemonCard();
      if (target) {
        effect.weakness = [];
      }
    }

    return state;
  }
}
