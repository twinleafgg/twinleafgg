import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import {AFTER_ATTACK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { TrainerType } from '../../../game/store/card/card-types';
import { CardList } from '../../../game/store/state/card-list';

export class Raticate extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Rattata';
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [{
    name: 'Gnaw Through',
    cost: [C],
    damage: 0,
    text: 'Discard a Pokémon Tool card attached to the Defending Pokémon.'
  },
  {
    name: 'Super Fang',
    cost: [C, C, C],
    damage: 0,
    text: 'Put damage counters on the Defending Pokémon until its remaining HP is 10.'
  }];

  public set: string = 'BCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Raticate';
  public fullName: string = 'Raticate BCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.active.tools.length === 1) {
        MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [opponent.active.tools[0]], sourceCard: this });
      } else if (opponent.active.tools.length > 1) {
        const toolList = new CardList();
        toolList.cards = [...opponent.active.tools];
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          toolList,
          { trainerType: TrainerType.TOOL },
          { min: 1, max: 1, allowCancel: false }
        ), selectedTools => {
          if (selectedTools && selectedTools.length === 1) {
            const tool = selectedTools[0];
            MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [tool], sourceCard: this });
          }
          return state;
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const selectedTarget = opponent.active;
      const checkHpEffect = new CheckHpEffect(effect.player, selectedTarget);
      store.reduceEffect(state, checkHpEffect);

      const totalHp = checkHpEffect.hp;
      let damageAmount = totalHp - 10;

      // Adjust damage if the target already has damage
      const targetDamage = selectedTarget.damage;
      if (targetDamage > 0) {
        damageAmount = Math.max(0, damageAmount - targetDamage);
      }

      if (damageAmount > 0) {
        const damageEffect = new PutCountersEffect(effect, damageAmount);
        damageEffect.target = selectedTarget;
        store.reduceEffect(state, damageEffect);
      } else if (damageAmount <= 0) {
        const damageEffect = new PutCountersEffect(effect, 0);
        damageEffect.target = selectedTarget;
        store.reduceEffect(state, damageEffect);
      }
    }

    return state;
  }
}