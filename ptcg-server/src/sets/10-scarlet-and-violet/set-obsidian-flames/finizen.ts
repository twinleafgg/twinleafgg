import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import {SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

// function* useAscension(next: Function, store: StoreLike, state: State,
//   effect: AttackEffect): IterableIterator<State> {

//   const player = effect.player;
//   const hasBenched = player.bench.some(b => b.cards.length > 0);

//   if (!hasBenched) {
//     throw new GameError(GameMessage.CANNOT_USE_ATTACK);
//   }

//   if (player.deck.cards.length === 0) {
//     throw new GameError(GameMessage.CANNOT_USE_ATTACK);
//   }
//   const cardList = StateUtils.findCardList(state, this);
//   const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
//   if (benchIndex === -1) {
//     throw new GameError(GameMessage.CANNOT_USE_POWER);
//   }

//   yield store.prompt(state, new ChoosePokemonPrompt(
//     player.id,
//     GameMessage.CHOOSE_NEW_ACTIVE_POKEMON,
//     PlayerType.BOTTOM_PLAYER,
//     [SlotType.BENCH],
//     { allowCancel: false },
//   ), selected => {
//     if (!selected || selected.length === 0) {
//       return state;
//     }
//     const target = selected[0];
//     player.switchPokemon(target);

//     let cards: Card[] = [];
//     state = store.prompt(state, new ChooseCardsPrompt(
//       player.id,
//       GameMessage.CHOOSE_CARD_TO_EVOLVE,
//       player.deck,
//       { superType: SuperType.POKEMON, stage: Stage.STAGE_1, evolvesFrom: 'Finizen' },
//       { min: 1, max: 1, allowCancel: true }
//     ), selected => {
//       cards = selected || [];
//       next();
//     });

//     if (cards.length > 0) {
//       // Evolve Pokemon
//       MOVE_CARDS(store, state, player.deck, player.bench[benchIndex], { cards: cards, sourceCard: effect.source.getPokemonCard()! });
//       player.bench[benchIndex].clearEffects();
//       player.bench[benchIndex].pokemonPlayedTurn = state.turn;
//     }

//     return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
//       player.deck.applyOrder(order);
//     });
//   });
// }

export class Finizen extends PokemonCard {

  public regulationMark = 'G';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 50;

  public weakness = [{ type: CardType.LIGHTNING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Valiant Evolution',
      cost: [CardType.WATER],
      damage: 0,
      text: 'Switch this Pokémon with 1 of your Benched Pokémon. If you do, search your deck for a card that evolves from this Pokémon and put it onto this Pokémon to evolve it. Then, shuffle your deck.'
    },
    {
      name: 'Razor Fin',
      cost: [CardType.WATER],
      damage: 10,
      text: ''
    },
  ];

  public set: string = 'OBF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '60';

  public name: string = 'Finizen';

  public fullName: string = 'Finizen OBF';

  public usedSpinTurn = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedSpinTurn = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedSpinTurn === true) {
      const player = effect.player;
      const hasBenched = player.bench.some(b => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);

      // After switching, we need to evolve Finizen
      let cards: PokemonCard[] = [];
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.deck,
        { superType: SuperType.POKEMON, evolvesFrom: 'Finizen' },
        { min: 0, max: 1, allowCancel: false }
      ), selected => {
        cards = (selected || []) as PokemonCard[];

        // Find Finizen's new location after the switch
        let finizensNewBenchIndex = -1;
        player.bench.forEach((benchSpot, index) => {
          if (benchSpot.cards.includes(this)) {
            finizensNewBenchIndex = index;
          }
        });

        if (!selected || selected.length === 0) {
          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        }

        // Move the evolution card from deck to bench first
        MOVE_CARDS(store, state, player.deck, player.bench[finizensNewBenchIndex], { cards: [cards[0]], sourceCard: this });

        const evolveEffect = new EvolveEffect(player, player.bench[finizensNewBenchIndex], cards[0]);
        store.reduceEffect(state, evolveEffect);

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    if (effect instanceof EndTurnEffect && this.usedSpinTurn) {
      this.usedSpinTurn = false;
    }

    return state;
  }
}
