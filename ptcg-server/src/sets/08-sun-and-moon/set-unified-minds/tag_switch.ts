import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  CardTransfer,
  SlotType,
  StateUtils,
  CardTarget,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  // Player has no Basic Energy in play
  let hasEnergy = false;
  let tagTeamPokemonCount = 0;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
    if (card.hasTag(CardTag.TAG_TEAM)) {
      tagTeamPokemonCount++;

      const energyAttached = cardList.energies.cards.some((c) => {
        return c.superType === SuperType.ENERGY;
      });
      hasEnergy = hasEnergy || energyAttached;
    }
  });

  if (!hasEnergy || tagTeamPokemonCount <= 1) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  const blockedFrom: CardTarget[] = [];

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    if (!card.hasTag(CardTag.TAG_TEAM)) {
      blockedFrom.push(target);
      return;
    }
  });

  let transfers: CardTransfer[] = [];
  yield store.prompt(
    state,
    new MoveEnergyPrompt(
      player.id,
      GameMessage.MOVE_ENERGY_CARDS,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { superType: SuperType.ENERGY },
      { min: 1, max: 2, allowCancel: false, blockedFrom },
    ),
    (result) => {
      transfers = result || [];
      next();
    },
  );

  transfers.forEach((transfer) => {
    const source = StateUtils.getTarget(state, player, transfer.from);
    const target = StateUtils.getTarget(state, player, transfer.to);
    MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: effect.trainerCard });
  });
  return state;
}

export class TagSwitch extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'UNM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '209';

  public name: string = 'Tag Switch';

  public fullName: string = 'Tag Switch UNM';

  public text: string =
    'Move up to 2 Energy from 1 of your TAG TEAM Pokémon to another of your Pokémon. ';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
