import { Card,
  CardManager,
  CardTag,
  CardTarget,
  CardType,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCard,
  PokemonCardList,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckPokemonPlayedTurnEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AttackEffect, HealEffect } from '../../../game/store/effects/game-effects';

function* useSuperGrowth(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Look through all known cards to find out if Pokemon can evolve
  const cm = CardManager.getInstance();
  const evolutions = cm.getAllCards().filter((c) => {
    return c instanceof PokemonCard && c.stage !== Stage.BASIC;
  }) as PokemonCard[];

  // Build possible evolution card names
  const evolutionNames: string[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
    const playedTurnEffect = new CheckPokemonPlayedTurnEffect(player, list);
    store.reduceEffect(state, playedTurnEffect);
    if (
      card.stage !== Stage.BASIC ||
      !pokemonHasCardType(card, CardType.GRASS) ||
      playedTurnEffect.pokemonPlayedTurn === state.turn
    ) {
      return;
    }
    const valid = evolutions.filter((e) => e.evolvesFrom === card.name);
    valid.forEach((c) => {
      if (!evolutionNames.includes(c.name)) {
        evolutionNames.push(c.name);
      }
    });
  });

  // There is nothing that can evolve
  if (evolutionNames.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const blocked2: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
    if (card.stage !== Stage.BASIC) {
      blocked2.push(target);
    }
  });

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH, SlotType.ACTIVE],
      { min: 1, max: 1, allowCancel: false, blocked: blocked2 },
    ),
    (selection) => {
      targets = selection || [];
      next();
    },
  );

  if (targets.length === 0) {
    SHUFFLE_DECK(store, state, player);
    return state; // canceled by user
  }

  const target = targets[0];
  const pokemonCard = target.getPokemonCard();
  if (pokemonCard === undefined) {
    return state; // invalid target?
  }

  // Blocking pokemon cards, that cannot be valid evolutions
  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (card instanceof PokemonCard && card.evolvesFrom !== pokemonCard.name) {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_EVOLVE,
      player.deck,
      { superType: SuperType.POKEMON, stage: Stage.STAGE_1, evolvesFrom: pokemonCard.name },
      { min: 1, max: 1, allowCancel: true, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  // Canceled by user, he didn't find the card in the deck
  if (cards.length === 0) {
    SHUFFLE_DECK(store, state, player);
    return state;
  }

  const evolution = cards[0] as PokemonCard;

  // Evolve Pokemon
  MOVE_CARDS(store, state, player.deck, target, { cards: [evolution], sourceCard: effect.source.getPokemonCard()! });
  target.clearEffects();
  target.pokemonPlayedTurn = state.turn;

  // Check if there's a Stage 2 evolution available
  const stage2Evolutions = evolutions.filter((e) => e.evolvesFrom === evolution.name);
  if (stage2Evolutions.length > 0) {
    // Blocking pokemon cards, that cannot be valid evolutions
    const blockedStage2: number[] = [];
    player.deck.cards.forEach((card, index) => {
      if (card instanceof PokemonCard && card.evolvesFrom !== evolution.name) {
        blockedStage2.push(index);
      }
    });

    let stage2Cards: Card[] = [];
    yield store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.deck,
        { superType: SuperType.POKEMON, stage: Stage.STAGE_2, evolvesFrom: evolution.name },
        { min: 1, max: 1, allowCancel: true, blocked: blockedStage2 },
      ),
      (selected) => {
        stage2Cards = selected || [];
        next();
      },
    );

    if (stage2Cards.length > 0) {
      const stage2Evolution = stage2Cards[0] as PokemonCard;
      MOVE_CARDS(store, state, player.deck, target, { cards: [stage2Evolution], sourceCard: effect.source.getPokemonCard()! });
      target.clearEffects();
      target.pokemonPlayedTurn = state.turn;
    }
  }

  SHUFFLE_DECK(store, state, player);
}

export class RowletAlolanExeggutorGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 270;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Suepr Growth',
      cost: [],
      damage: 0,
      text: 'Search your deck for a card that evolves from 1 of your [G] Pokémon and put it onto that Pokémon to evolve it. If that Pokémon is now a Stage 1 Pokémon, search your deck for a Stage 2 Pokémon that evolves from that Pokémon and put it onto that Pokémon to evolve it. Then, shuffle your deck. ',
    },
    {
      name: 'Calming Hurricane',
      cost: [G, G, C],
      damage: 150,
      text: 'Heal 30 damage from this Pokémon.',
    },
    {
      name: 'Tropical Hour-GX',
      cost: [G, G, G],
      damage: 200,
      gxAttack: true,
      text: "If this Pokémon has at least 3 extra Energy attached to it (in addition to this attack's cost), your opponent shuffles all Energy from all of their Pokémon into their deck. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set = 'UNM';
  public setNumber = '1';
  public cardImage = 'assets/cardback.png';
  public name = 'Rowlet & Alolan Exeggutor-GX';
  public fullName = 'Rowlet & Alolan Exeggutor-GX UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Super Growth
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useSuperGrowth(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    // Calming Hurricane
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const healing = new HealEffect(effect.player, effect.player.active, 30);
      store.reduceEffect(state, healing);
    }

    // Tropical Hour-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const extraEffectCost: CardType[] = [G, G, G, G, G, G];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (meetsExtraEffectCost) {
        opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (card) => {
          const opponentEnergy = new CheckProvidedEnergyEffect(opponent, card);
          state = store.reduceEffect(state, opponentEnergy);

          opponentEnergy.energyMap.forEach((em) => {
            MOVE_CARDS(store, state, em.card.cards, opponent.deck, { sourceCard: this });
          });
        });

        SHUFFLE_DECK(store, state, opponent);
      }
    }

    return state;
  }
}
