import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChoosePokemonPrompt, PlayerType, SlotType } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Donphan extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Phanpy';

  public cardType: CardType[] = [CardType.FIGHTING];

  public hp: number = 130;

  public weakness = [{ type: CardType.WATER }];

  public resistance = [{ type: CardType.LIGHTNING, value: -20 }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Spinning Turn',
      cost: [CardType.FIGHTING],
      damage: 40,
      text: 'Switch this Pokemon with 1 of your Benched Pokemon.'
    }, {
      name: 'Wreck',
      cost: [CardType.FIGHTING, CardType.FIGHTING, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: 'If there is any Stadium card in play, this attack does ' +
        '60 more damage. Discard that Stadium card.'
    },
  ];

  public set: string = 'PLS';

  public name: string = 'Donphan';

  public fullName: string = 'Donphan PLS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '72';

  public hitAndRun: boolean = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.hitAndRun = true;
    }

    if (effect instanceof EndTurnEffect && this.hitAndRun == true) {
      const player = effect.player;
      const hasBenched = player.bench.some(b => b.cards.length > 0);

      if (!hasBenched) {
        this.hitAndRun = false;
        return state;
      }

      return state = store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_NEW_ACTIVE_POKEMON,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false },
      ), selected => {
        if (!selected || selected.length === 0) {
          this.hitAndRun = false;
          return state;
        }
        this.hitAndRun = false;
        const target = selected[0];
        player.switchPokemon(target);
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        effect.damage += 60;
        // Discard Stadium
        const cardList = StateUtils.findCardList(state, stadiumCard);
        const player = StateUtils.findOwner(state, cardList);
        MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
      }
    }

    return state;
  }

}
