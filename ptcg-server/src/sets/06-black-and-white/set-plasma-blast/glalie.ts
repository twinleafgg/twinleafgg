import {ADD_SLEEP_TO_PLAYER_ACTIVE,
  AFTER_ATTACK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';

import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
export class Glalie extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Snorunt';
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: M }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Powder Snow',
      cost: [W, C],
      damage: 30,
      text: 'The Defending Pok\u00e9mon is now Asleep.',
    },
    {
      name: 'Reflect Energy',
      cost: [W, C, C],
      damage: 60,
      text: 'Move a [W] Energy from this Pok\u00e9mon to 1 of your Benched Pok\u00e9mon.',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '22';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Glalie';
  public fullName: string = 'Glalie PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (AFTER_ATTACK(effect, 0, this)) {
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasBench = player.bench.some((b) => b.cards.length > 0);
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);

      const waterProvidingCards = new Set<(typeof checkProvidedEnergy.energyMap)[0]['card']>();
      checkProvidedEnergy.energyMap.forEach((em) => {
        if (
          em.card.superType === SuperType.ENERGY &&
          (em.provides.includes(CardType.WATER) || em.provides.includes(CardType.ANY))
        ) {
          waterProvidingCards.add(em.card);
        }
      });

      const blocked: number[] = [];
      player.active.cards.forEach((card, index) => {
        if (card.superType !== SuperType.ENERGY || !waterProvidingCards.has(card)) {
          blocked.push(index);
        }
      });

      if (blocked.length !== player.active.cards.length && hasBench) {
        return store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_TO_BENCH,
            player.active,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { superType: SuperType.ENERGY },
            { min: 1, max: 1, allowCancel: false, blocked },
          ),
          (transfers) => {
            if (transfers && transfers.length > 0) {
              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
              }
            }
          },
        );
      }
    }

    return state;
  }
}
