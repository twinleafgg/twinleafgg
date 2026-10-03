import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { MoveEnergyPrompt, CardTransfer } from '../../../game/store/prompts/move-energy-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { Player } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  // Player has no Basic Energy in the discard pile
  let hasBasicEnergy = false;
  let pokemonCount = 0;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
    pokemonCount += 1;
    const basicEnergyAttached = cardList.cards.some((c) => {
      return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC;
    });
    hasBasicEnergy = hasBasicEnergy || basicEnergyAttached;
  });

  if (!hasBasicEnergy || pokemonCount <= 1) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let transfers: CardTransfer[] = [];
  yield store.prompt(
    state,
    new MoveEnergyPrompt(
      player.id,
      GameMessage.MOVE_ENERGY_CARDS,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
      { min: 1, max: 1, allowCancel: false },
    ),
    (result) => {
      transfers = result || [];
      next();
    },
  );

  transfers.forEach((transfer) => {
    const source = StateUtils.getTarget(state, player, transfer.from);
    const target = StateUtils.getTarget(state, player, transfer.to);
    MOVE_CARDS(store, state, source, target, {
      cards: [transfer.card],
      sourceCard: effect.trainerCard,
    });
  });
  return state;
}

export class EnergySwitch extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'SVI';

  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '173';

  public name: string = 'Energy Switch';

  public fullName: string = 'Energy Switch SVI';

  public text: string = 'Move a basic Energy from 1 of your Pokemon to another of your Pokemon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // Player has no Basic Energy in the discard pile
    let hasBasicEnergy = false;
    let pokemonCount = 0;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      pokemonCount += 1;
      const basicEnergyAttached = cardList.cards.some((c) => {
        return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC;
      });
      hasBasicEnergy = hasBasicEnergy || basicEnergyAttached;
    });

    if (!hasBasicEnergy || pokemonCount <= 1) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
