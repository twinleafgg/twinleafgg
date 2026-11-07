import { CardTarget, CardType, ChoosePokemonPrompt, GameError, GameMessage, Player, PlayerType, SlotType, State, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_POKEMON_OFF_BOARD, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class CrasherWakesPassion extends TrainerCard {
  protected _trainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Crasher Wake\'s Passion';
  public fullName: string = 'Crasher Wake\'s Passion FLO';
  public text: string = 'Choose 1 of your [W] Pokémon in play and shuffle it and all attached cards into your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }

    let hasWaterPokemon = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const checkType = new CheckPokemonTypeEffect(cardList);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.WATER)) {
        hasWaterPokemon = true;
      }
    });
    return hasWaterPokemon;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const blocked: CardTarget[] = [];
      let hasWaterPokemon = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.WATER)) {
          hasWaterPokemon = true;
        } else {
          blocked.push(target);
        }
      });

      if (!hasWaterPokemon) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SHUFFLE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }

        MOVE_POKEMON_OFF_BOARD(store, state, targets[0], {
          pokemonDestination: player.deck,
          sourceCard: this,
          sourceEffect: effect
        });
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
