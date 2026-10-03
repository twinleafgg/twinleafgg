import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { SupporterEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  PlayerType,
  SlotType,
  StateUtils,
  CardTarget,
  GameError,
  GameMessage,
  PokemonCardList,
  ChooseCardsPrompt,
  Card,
} from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
  trainerCard: TrainerCard,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let hasPokemonWithEnergy = false;
  const blocked: CardTarget[] = [];
  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
    if (
      cardList.energies.cards.some(
        (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
      )
    ) {
      hasPokemonWithEnergy = true;
    } else {
      blocked.push(target);
    }
  });

  const stadiumCard = StateUtils.getStadiumCard(state);

  if (!hasPokemonWithEnergy && stadiumCard === undefined) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (!hasPokemonWithEnergy && stadiumCard !== undefined) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (hasPokemonWithEnergy && stadiumCard === undefined) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
      PlayerType.TOP_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: true, blocked },
    ),
    (results) => {
      targets = results || [];
      next();
    },
  );

  if (targets.length === 0) {
    return state;
  }

  const cardList = targets[0];

  if (cardList.isStage(Stage.BASIC)) {
    try {
      const supporterEffect = new SupporterEffect(player, effect.trainerCard);
      store.reduceEffect(state, supporterEffect);
    } catch {
      return state;
    }
  }

  const target = targets[0];
  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      target,
      { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
      { min: 1, max: 1, allowCancel: true },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  if (cards.length > 0) {
    // Discard trainer only when user selected a Pokemon
    // Discard selected special energy card
    MOVE_CARDS(store, state, target, opponent.discard, { cards, sourceCard: trainerCard });
  }

  if (stadiumCard !== undefined) {
    // Discard Stadium
    const cardList = StateUtils.findCardList(state, stadiumCard);
    const playerStadium = StateUtils.findOwner(state, cardList);
    MOVE_CARDS(store, state, cardList, playerStadium.discard, { sourceCard: trainerCard });
    return state;
  }
}
export class Flannery extends TrainerCard {
  public regulationMark = 'E';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '139';

  public name: string = 'Flannery';

  public fullName: string = 'Flannery CRE';

  public text: string =
    "Discard a Special Energy attached to 1 of your opponent's Pokémon, and discard a Stadium in play.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect, this);
      return generator.next().value;
    }
    return state;
  }
}
