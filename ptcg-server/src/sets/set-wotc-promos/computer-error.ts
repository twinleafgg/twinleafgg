import { StoreLike, State, GameMessage, StateUtils, SelectPrompt } from '../../game';
import { CardTag, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ComputerError extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.ROCKETS_SECRET_MACHINE];
  public set: string = 'PR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Computer Error';
  public fullName: string = 'Computer Error PR';

  public text =
    "You may draw up to 5 cards, then your opponent may draw up to 5 cards. Your turn is over now (you don't get to attack).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      const maxPlayerDraw = 5;

      const options: { message: string; value: number }[] = [];
      for (let i = maxPlayerDraw; i >= 0; i--) {
        options.push({ message: `Draw ${i} card(s)`, value: i });
      }

      store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.WANT_TO_DRAW_CARDS,
          options.map((c) => c.message),
          { allowCancel: false },
        ),
        (choice) => {
          const numCardsToDraw = options[choice].value;
          MOVE_CARDS(store, state, player.deck, player.hand, { count: numCardsToDraw, sourceCard: this });

          const opponentOptions: { message: string; value: number }[] = [];
          for (let i = maxPlayerDraw; i >= 0; i--) {
            opponentOptions.push({ message: `Draw ${i} card(s)`, value: i });
          }

          store.prompt(
            state,
            new SelectPrompt(
              opponent.id,
              GameMessage.WANT_TO_DRAW_CARDS,
              opponentOptions.map((c) => c.message),
              { allowCancel: false },
            ),
            (opponentChoice) => {
              const opponentNumCardsToDraw = opponentOptions[opponentChoice].value;
              MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: opponentNumCardsToDraw, sourceCard: this });
            },
          );
        },
      );

      // Pretty much just for Chaos Gym: if used while not your turn, there is no end turn effect
      // Better to refer to whoever's turn it is, but idk how to do that
      if (effect.player === StateUtils.findOwner(state, StateUtils.findCardList(state, this))) {
        const endTurnEffect = new EndTurnEffect(player);
        store.reduceEffect(state, endTurnEffect);
      }
    }

    return state;
  }
}
