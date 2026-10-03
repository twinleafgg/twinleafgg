import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { MOVE_CARDS, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';

//Avery is not done yet!! have to add the "remove from bench" logic

export class CyrusPrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'UPR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '120';
  public name: string = 'Cyrus Prism Star';
  public fullName: string = 'Cyrus Prism Star UPR';

  public text: string =
    'You can play this card only if your Active Pokémon is a [W] or [M] Pokémon.\n\n' +
    'Your opponent chooses 2 Benched Pokémon and shuffles the others, and all cards attached to them, into their deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const supporterTurn = player.supporterTurn;
      const opponent = StateUtils.getOpponent(state, player);

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      let hasActiveWaterMetal = false;

      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(player.active);
      store.reduceEffect(state, checkPokemonTypeEffect);
      if (
        checkPokemonTypeEffect.cardTypes.includes(CardType.WATER) ||
        checkPokemonTypeEffect.cardTypes.includes(CardType.METAL)
      ) {
        hasActiveWaterMetal = true;
      }

      if (!hasActiveWaterMetal) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const opponentBenched = opponent.bench.filter((c) => c.cards.length > 0);
      if (opponentBenched.length > 2) {
        store.prompt(
          state,
          new ChoosePokemonPrompt(
            opponent.id,
            GameMessage.CHOOSE_CARDS,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { allowCancel: false, min: Math.min(opponentBenched.length, 2), max: 2 },
          ),
          (targets) => {
            if (!targets || targets.length === 0) {
              return;
            }

            opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (card) => {
              if (card !== opponent.active && !targets.includes(card)) {
                card.clearEffects();
                MOVE_CARDS(store, state, card, opponent.deck);
                SHUFFLE_DECK(store, state, opponent);
              }
            });
          },
        );
      }

      return state;
    }
    return state;
  }
}
