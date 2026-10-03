import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {CONFIRMATION_PROMPT,
  MOVE_CARD_TO,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import {
  Card,
  CardTarget,
  ChoosePokemonPrompt,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Suicuneex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Energy Flip',
      cost: [W],
      damage: 0,
      text: "Choose 1 of your opponent's Benched Pokémon. This attack does 10 damage to that Pokémon. You may move an Energy card attached to that Pokémon to another of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Reverse Stream',
      cost: [W, W, C],
      damage: 50,
      damageCalculation: '+',
      text: 'You may return all basic Energy cards attached to Suicune ex to your hand. If you do, this attack does 50 damage plus 10 more damage for each basic Energy card you returned.',
    },
  ];

  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Suicune ex';
  public fullName: string = 'Suicune ex MA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      const opponentBench = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
      if (opponentBench === 0) {
        return state;
      }

      store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const targets = selected;

          const blockedFrom: CardTarget[] = [];
          opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
            if (cardList !== targets[0]) {
              blockedFrom.push(target);
            }
          });

          targets.forEach((target) => {
            //damage
            const damageEffect = new DealDamageEffect(effect, 10);
            damageEffect.target = target;
            if (target !== opponent.active) {
              effect.ignoreWeakness = true;
              effect.ignoreResistance = true;
            }
            store.reduceEffect(state, damageEffect);

            // Move energy
            const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
              const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
              store.reduceEffect(state, checkProvidedEnergy);

              const blockedCards: Card[] = [];
              checkProvidedEnergy.energyMap.forEach((em) => {
                if (em.provides.length === 0) {
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

            store.prompt(
              state,
              new MoveEnergyPrompt(
                player.id,
                GameMessage.MOVE_ENERGY_CARDS,
                PlayerType.TOP_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                {},
                { min: 0, max: 1, allowCancel: false, blockedMap, blockedFrom },
              ),
              (transfers) => {
                if (transfers === null) {
                  return;
                }

                for (const transfer of transfers) {
                  const source = StateUtils.getTarget(state, player, transfer.from);
                  const target = StateUtils.getTarget(state, player, transfer.to);

                  MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
                }
              },
            );
          });
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      CONFIRMATION_PROMPT(
        store,
        state,
        player,
        (result) => {
          if (result) {
            // Damage for each basic energy card
            player.active.cards.forEach((c) => {
              if (c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC) {
                effect.damage += 10;
              }
            });
            // Move all basic energy cards to hand
            player.active.cards.forEach((c) => {
              if (c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC) {
                MOVE_CARD_TO(state, c, player.hand);
              }
            });
          }
        },
        GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK,
      );
    }

    return state;
  }
}
