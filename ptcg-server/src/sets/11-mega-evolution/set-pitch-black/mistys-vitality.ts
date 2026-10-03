import { Card } from '../../../game/store/card/card';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt, PlayerType, SlotType, Player } from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playMistysCheerfulness(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
  self: MistysVitality,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
      { min: 0, max: 4, allowCancel: false },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { allowCancel: false, min: 1, max: 1 },
      ),
      (targets) => {
        if (!targets || targets.length === 0) {
          return;
        }
        const target = targets[0];
        MOVE_CARDS(store, state, player.deck, target, { cards, sourceCard: self });
        next();
      },
    );
  }

  store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });

  const endTurnEffect = new EndTurnEffect(player);
  return store.reduceEffect(state, endTurnEffect);
}

export class MistysVitality extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark: string = 'J';
  public set: string = 'PBL';
  public setNumber: string = '80';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Misty's Vitality";
  public fullName: string = "Misty's Cheerfulness M5";
  public text: string =
    'Search your deck for up to 4 Basic [W] Energy cards and attach them to 1 of your Pokémon. Then, shuffle your deck. Your turn ends.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const generator = playMistysCheerfulness(() => generator.next(), store, state, effect, this);
      return generator.next().value;
    }

    return state;
  }
}
