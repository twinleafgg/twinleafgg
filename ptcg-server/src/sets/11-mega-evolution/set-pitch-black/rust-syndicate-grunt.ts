import {
  CardTarget,
  PlayerType,
  SlotType,
  StateUtils,
  StoreLike,
  State,
  Player,
} from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CLEAN_UP_SUPPORTER } from '../../../game/store/prefabs/trainer-prefabs';

export class RustSyndicateGrunt extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'PBL';
  public setNumber: string = '81';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Rust Syndicate Grunt';
  public fullName: string = 'Rust Syndicate Grunt M5';
  public text: string =
    "You can use this card only if any of your Pokémon were Knocked Out during your opponent's last turn.\n\n" +
    "Discard an Energy from 1 of your opponent's Pokémon.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.hand.cards.filter((c) => c !== this).length > 0) {
      return false;
    }
    if (!WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player)) {
      return false;
    }
    const opponent = StateUtils.getOpponent(state, player);
    let anyEnergy = false;
    opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
      if (cardList.energies.cards.length > 0) {
        anyEnergy = true;
      }
    });
    if (!anyEnergy) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      return playRust(store, state, effect, this);
    }
    return state;
  }
}

function playRust(
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
  self: RustSyndicateGrunt,
): State {
  const player = effect.player;

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  const otherCards = player.hand.cards.filter((c) => c !== effect.trainerCard);
  if (otherCards.length > 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (!WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const opponent = StateUtils.getOpponent(state, player);

  const blocked: CardTarget[] = [];
  let anyEnergy = false;
  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
    if (cardList.energies.cards.length > 0) {
      anyEnergy = true;
    }
  });

  if (!anyEnergy) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
    if (cardList.energies.cards.length === 0) {
      blocked.push(target);
    }
  });

  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
      PlayerType.TOP_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: false, blocked },
    ),
    (targets) => {
      const tgt = targets && targets[0];
      if (!tgt) {
        CLEAN_UP_SUPPORTER(store, effect, player);
        return state;
      }
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          tgt.energies,
          {},
          { min: 1, max: 1, allowCancel: false },
        ),
        (sel) => {
          MOVE_CARDS(store, state, tgt, opponent.discard, { cards: sel || [], sourceCard: self });
          CLEAN_UP_SUPPORTER(store, effect, player);
          return state;
        },
      );
    },
  );
}
