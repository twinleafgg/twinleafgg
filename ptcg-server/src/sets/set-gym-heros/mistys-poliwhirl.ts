import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../game/store/card/card-types';
import {COIN_FLIP_PROMPT, WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';

export class MistysPoliwhirl extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = "Misty's Poliwag";
  protected _tags = [CardTag.MISTYS];
  public cardType: CardType[] = [W];
  public hp: number = 70;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Rapids',
      cost: [W, C],
      damage: 20,
      text: 'If the Defending Pokémon has any Energy cards attached to it, flip a coin. If heads, choose 1 of those Energy cards and discard it.',
    },
    {
      name: 'Water Punch',
      cost: [C, C, C],
      damage: 30,
      damageCalculation: '+',
      text: "Flip a number of coins equal to the number of [W] Energy attached to Misty's Poliwhirl. This attack does 30 damage plus 10 damage for each heads.",
    },
  ];

  public set: string = 'G1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = "Misty's Poliwhirl";
  public fullName: string = "Misty's Poliwhirl G1";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              opponent.active,
              { superType: SuperType.ENERGY },
              { min: 0, max: 1, allowCancel: false },
            ),
            (selected) => {
              const card = selected[0];
              if (!card) {
                return;
              }
              MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [card], sourceCard: this });
            },
          );
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      // Count only energies that provide [W]
      let waterEnergyCount = 0;
      checkProvidedEnergyEffect.energyMap.forEach((em) => {
        if (em.provides.includes(CardType.WATER) || em.provides.includes(CardType.ANY)) {
          waterEnergyCount++;
        }
      });

      if (waterEnergyCount > 0) {
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, waterEnergyCount, results => {
          effect.damage += results.filter(r => r).length * 10;
        });
      }
    }

    return state;
  }
}
