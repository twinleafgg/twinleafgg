import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  EnergyType,
  CardTag,
} from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import {
  Card,
  CardTarget,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PokemonCardList,
  PowerType,
  ShuffleDeckPrompt,
  SlotType,
  StateUtils,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useShadowConnection(
  next: Function,
  store: StoreLike,
  state: State,
  effect: PowerEffect,
): IterableIterator<State> {
  const player = effect.player;

  const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
    store.reduceEffect(state, checkProvidedEnergy);
    const blockedCards: Card[] = [];

    checkProvidedEnergy.energyMap.forEach((em) => {
      if (!em.provides.includes(D) || em.card.energyType !== EnergyType.BASIC) {
        blockedCards.push(em.card);
      }
    });

    const blocked: number[] = [];
    blockedCards.forEach((bc) => {
      const index = cardList.cards.indexOf(bc);
      if (index !== -1 && !blocked.includes(index)) {
        blocked.push(index);
      }
    });

    if (blocked.length !== 0) {
      blockedMap.push({ source: target, blocked });
    }
  });

  return store.prompt(
    state,
    new MoveEnergyPrompt(
      effect.player.id,
      GameMessage.MOVE_ENERGY_CARDS,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH, SlotType.ACTIVE],
      { superType: SuperType.ENERGY },
      { allowCancel: true, blockedMap },
    ),
    (transfers) => {
      if (transfers === null) {
        return;
      }

      for (const transfer of transfers) {
        const source = StateUtils.getTarget(state, player, transfer.from);
        const target = StateUtils.getTarget(state, player, transfer.to);
        MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: effect.card });
      }
    },
  );
}

export class WeavileGX extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  protected _tags = [CardTag.POKEMON_GX];
  public evolvesFrom = 'Sneasel';
  public cardType: CardType[] = [D];
  public hp: number = 200;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Shadow Connection',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: 'As often as you like during your turn (before your attack), you may move a basic [D] Energy from 1 of your Pokémon to another of your Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Claw Slash',
      cost: [D, D, C],
      damage: 130,
      text: '',
    },
    {
      name: 'Nocturnal Maneuvers-GX',
      cost: [C],
      damage: 0,
      text: "Search your deck for any number of Basic Pokémon and put them onto your Bench. Then, shuffle your deck. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'UNM';
  public name: string = 'Weavile-GX';
  public fullName: string = 'Weavile-GX UNM';
  public setNumber: string = '132';
  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shadow Connection
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useShadowConnection(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    // Nocturnal Maneuvers-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      if (player.usedGX) {
        throw new GameError(GameMessage.LABEL_GX_USED);
      }
      player.usedGX = true;

      let missingBenched = 0;
      player.bench.forEach((benchedSpot) => {
        if (benchedSpot.cards.length === 0) {
          missingBenched++;
        }
      });

      let cards: Card[] = [];
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.deck,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max: missingBenched, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];

          cards.forEach((card, index) => {
            store.reduceEffect(
              state,
              new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]),
            );
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    return state;
  }
}
