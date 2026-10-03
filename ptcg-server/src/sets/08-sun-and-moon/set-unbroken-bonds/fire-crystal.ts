import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardToHandEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  // Player has no Fire Energy in the discard pile
  let energyInDiscard = 0;
  player.discard.cards.forEach((c) => {
    if (
      c instanceof EnergyCard &&
      c.energyType === EnergyType.BASIC &&
      c.provides.includes(CardType.FIRE)
    ) {
      energyInDiscard += 1;
    }
  });

  if (energyInDiscard === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const max = Math.min(3, energyInDiscard);

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.discard,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
      { min: max, max, allowCancel: false },
    ),
    (selected) => {
      if (selected && selected.length > 0) {
        // Recover discarded energies
        MOVE_CARDS(store, state, player.discard, player.hand, {
          cards: selected,
          sourceCard: effect.trainerCard,
        });
      }
    },
  );
}

export class FireCrystal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '173';
  public name: string = 'Fire Crystal';
  public fullName: string = 'Fire Crystal UNB';

  public text: string = 'Put 3 [R] Energy cards from your discard pile into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        // If prevented, just discard the card and return

        return state;
      }

      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
