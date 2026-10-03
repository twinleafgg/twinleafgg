import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, PokemonCardList, Card, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, SelectPrompt, GameLog } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

function* useCallForFamily(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;
  const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);
  const max = Math.min(slots.length, 2);

  if (max === 0) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
    player.deck,
    { superType: SuperType.POKEMON, stage: Stage.BASIC },
    { min: 0, max, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length > slots.length) {
    cards.length = slots.length;
  }

  cards.forEach((card, index) => {
    store.reduceEffect(state, new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]));
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

function* useSurpriseFist(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = effect.opponent;

  // Set base damage
  effect.damage = 60;

  // Create RPS choices
  const choices = [
    GameMessage.ROCK,
    GameMessage.PAPER,
    GameMessage.SCISSORS
  ];

  let playerChoice = 0;
  let opponentChoice = 0;

  // Player chooses Rock, Paper, or Scissors
  yield store.prompt(state, new SelectPrompt(
    player.id,
    GameMessage.ROCK_PAPER_SCISSORS,
    choices,
    { allowCancel: false }
  ), choice => {
    playerChoice = choice;
    next();
  });

  // Opponent chooses Rock, Paper, or Scissors
  yield store.prompt(state, new SelectPrompt(
    opponent.id,
    GameMessage.ROCK_PAPER_SCISSORS,
    choices,
    { allowCancel: false }
  ), choice => {
    opponentChoice = choice;
    next();
  });

  // Determine winner
  // 0 = Rock, 1 = Paper, 2 = Scissors
  // Rock beats Scissors, Scissors beats Paper, Paper beats Rock
  let playerWins = false;

  if (playerChoice === opponentChoice) {
    // Tie - no bonus damage
    playerWins = false;
  } else if (
    (playerChoice === 0 && opponentChoice === 2) || // Rock beats Scissors
    (playerChoice === 1 && opponentChoice === 0) || // Paper beats Rock
    (playerChoice === 2 && opponentChoice === 1)    // Scissors beats Paper
  ) {
    playerWins = true;
  }

  // Apply bonus damage if player wins
  if (playerWins) {
    effect.damage = 120;
    store.log(state, GameLog.LOG_TEXT, { text: `${player.name} wins Rock-Paper-Scissors!` });
  } else {
    store.log(state, GameLog.LOG_TEXT, { text: `${player.name} did not win Rock-Paper-Scissors.` });
  }

  return state;
}

export class Pyukumuku extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 70;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Call for Family',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Then, shuffle your deck.'
  }, {
    name: 'Surprise Fist',
    cost: [W, C, C],
    damage: 60,
    text: 'You and your opponent play Rock-Paper-Scissors. If you win, this attack does 60 more damage.'
  }];

  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Pyukumuku';
  public fullName: string = 'Pyukumuku UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Call for Family attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useCallForFamily(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    // Surprise Fist attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const generator = useSurpriseFist(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}

