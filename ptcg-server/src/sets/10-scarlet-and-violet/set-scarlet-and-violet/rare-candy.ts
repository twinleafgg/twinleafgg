import { Card } from '../../../game/store/card/card';
import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, Stage, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardManager } from '../../../game/cards/card-manager';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { CheckPokemonPlayedTurnEffect } from '../../../game/store/effects/check-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { Player } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function isMatchingStage2(stage1: PokemonCard[], basic: PokemonCard, stage2: PokemonCard): boolean {
  for (const card of stage1) {
    if (card.name === stage2.evolvesFrom && basic.name === card.evolvesFrom) {
      return true;
    }
  }
  return false;
}

function canUseRareCandy(store: StoreLike, state: State, player: Player): boolean {
  const stage2 = player.hand.cards.filter(
    (c) => c instanceof PokemonCard && c.stage === Stage.STAGE_2,
  ) as PokemonCard[];
  if (stage2.length === 0) {
    return false;
  }

  const stage1 = CardManager.getInstance()
    .getAllCards()
    .filter((c) => c instanceof PokemonCard && c.stage === Stage.STAGE_1) as PokemonCard[];

  let hasBasicPokemon = false;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
    if (card.stage !== Stage.BASIC) {
      return;
    }
    if (!stage2.some((s) => isMatchingStage2(stage1, card, s))) {
      return;
    }

    const playedTurnEffect = new CheckPokemonPlayedTurnEffect(player, list);
    store.reduceEffect(state, playedTurnEffect);
    if (playedTurnEffect.pokemonPlayedTurn < state.turn) {
      hasBasicPokemon = true;
    }
  });
  return hasBasicPokemon;
}

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  // Create list of non - Pokemon SP slots
  const blocked: CardTarget[] = [];

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  if (!canUseRareCandy(store, state, player)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const stage2 = player.hand.cards.filter((c) => {
    return c instanceof PokemonCard && c.stage === Stage.STAGE_2;
  }) as PokemonCard[];

  // Look through all known cards to find out if it's a valid Stage 2
  const stage1 = CardManager.getInstance()
    .getAllCards()
    .filter((c) => {
      return c instanceof PokemonCard && c.stage === Stage.STAGE_1;
    }) as PokemonCard[];

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
    if (card.stage === Stage.BASIC && stage2.some((s) => isMatchingStage2(stage1, card, s))) {
      const playedTurnEffect = new CheckPokemonPlayedTurnEffect(player, list);
      store.reduceEffect(state, playedTurnEffect);
      if (playedTurnEffect.pokemonPlayedTurn < state.turn) {
        return;
      }
    }
    blocked.push(target);
  });

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: false, blocked },
    ),
    (selection) => {
      targets = selection || [];
      next();
    },
  );

  if (targets.length === 0) {
    return state; // canceled by user
  }
  const pokemonCard = targets[0].getPokemonCard();
  if (pokemonCard === undefined) {
    return state; // invalid target?
  }

  const blocked2: number[] = [];
  player.hand.cards.forEach((c, index) => {
    if (c instanceof PokemonCard && c.stage === Stage.STAGE_2) {
      if (!isMatchingStage2(stage1, pokemonCard, c)) {
        blocked2.push(index);
      }
    }
  });

  let cards: Card[] = [];
  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_EVOLVE,
      player.hand,
      { superType: SuperType.POKEMON, stage: Stage.STAGE_2 },
      { min: 1, max: 1, allowCancel: false, blocked: blocked2 },
    ),
    (selected) => {
      cards = selected || [];

      if (cards.length > 0) {
        const pokemonCard = cards[0] as PokemonCard;
        const evolveEffect = new EvolveEffect(player, targets[0], pokemonCard);
        store.reduceEffect(state, evolveEffect);

        // Discard trainer only when user selected a Pokemon
      }
    },
  );
}

export class RareCandy extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '191';

  public name: string = 'Rare Candy';

  public fullName: string = 'Rare Candy SVI';

  public text: string =
    'Choose 1 of your Basic Pokemon in play. If you have a Stage 2 card in ' +
    'your hand that evolves from that Pokemon, put that card onto the Basic ' +
    "Pokemon to evolve it. You can't use this card during your first turn " +
    'or on a Basic Pokemon that was put into play this turn.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return canUseRareCandy(store, state, player);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
