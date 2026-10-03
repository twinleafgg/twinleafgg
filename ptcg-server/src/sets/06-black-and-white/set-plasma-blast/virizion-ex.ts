import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  PowerType,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
  GameMessage,
  Card,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { AttackEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckProvidedEnergyEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useEmeraldSlash(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  const hasBenched = player.bench.some((b) => b.cards.length > 0);
  if (!hasBenched) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.ENERGY, name: 'Grass Energy' },
      { min: 1, max: 2, allowCancel: true },
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
        [SlotType.BENCH],
        { allowCancel: true },
      ),
      (targets) => {
        if (!targets || targets.length === 0) {
          return;
        }
        const target = targets[0];
        MOVE_CARDS(store, state, player.deck, target, { cards: cards, sourceCard: effect.source.getPokemonCard()! });
        next();
      },
    );
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class VirizionEX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_EX];
  public cardType: CardType[] = [G];
  public hp: number = 170;
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Verdant Wind',
      powerType: PowerType.ABILITY,
      text: "Each of your Pokémon that has any [G] Energy attached to it can't be affected by any Special Conditions. (Remove any Special Conditions affecting those Pokémon.)",
    },
  ];

  public attacks = [
    {
      name: 'Emerald Slash',
      cost: [G, C],
      damage: 50,
      text: 'You may search your deck for 2 [G] Energy cards and attach them to 1 of your Benched Pokémon. Shuffle your deck afterward.',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '9';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Virizion-EX';
  public fullName: string = 'Virizion EX PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useEmeraldSlash(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        if (player.active.specialConditions.length === 0) {
          return;
        }

        let hasVirizionInPlay = false;
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
          if (card === this) {
            hasVirizionInPlay = true;
          }
        });

        if (!hasVirizionInPlay) {
          return state;
        }

        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
        store.reduceEffect(state, checkProvidedEnergyEffect);

        const energyMap = checkProvidedEnergyEffect.energyMap;
        const hasGrassEnergy = StateUtils.checkEnoughEnergy(energyMap, [CardType.GRASS]);

        if (hasGrassEnergy) {
          // Try to reduce PowerEffect, to check if something is blocking our ability
          try {
            const stub = new PowerEffect(
              player,
              {
                name: 'test',
                powerType: PowerType.ABILITY,
                text: '',
              },
              this,
            );
            store.reduceEffect(state, stub);
          } catch {
            return state;
          }

          const conditions = player.active.specialConditions.slice();
          conditions.forEach((condition) => {
            player.active.removeSpecialCondition(condition);
          });
        }
      });
    }

    return state;
  }
}
