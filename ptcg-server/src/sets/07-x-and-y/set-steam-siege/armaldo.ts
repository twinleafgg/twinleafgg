import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { GameMessage, PlayerType, StoreLike, State, StateUtils } from '../../../game';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { SlotType } from '../../../game/store/actions/play-card-action';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Armaldo extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Anorith';
  public cardType: CardType[] = [F];
  public hp: number = 150;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Rushing Water',
    cost: [C],
    damage: 40,
    text: 'Move an Energy from your opponent\'s Active Pokémon to 1 of his or her Benched Pokémon.'
  },
  {
    name: 'Guard Claw',
    cost: [F, C, C],
    damage: 100,
    text: 'During your opponent\'s next turn, any damage done to this Pokémon by attacks is reduced by 30 (after applying Weakness and Resistance).'
  }];

  public set: string = 'STS';
  public setNumber: string = '57';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Armaldo';
  public fullName: string = 'Armaldo STS';

  public usedRushingWater = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rushing Water
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedRushingWater = true;
    }

    if (effect instanceof EndTurnEffect && this.usedRushingWater) {
      this.usedRushingWater = false;
    }

    if (effect instanceof AfterAttackEffect && this.usedRushingWater) {
      this.usedRushingWater = false;
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const energyCards = opponent.active.cards.filter(c => c.superType === SuperType.ENERGY);
      const hasBenched = opponent.bench.some(b => b.cards.length > 0);
      if (energyCards.length === 0 || !hasBenched) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        opponent.active,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        if (!selected || selected.length === 0) { return; }
        const energyCard = selected[0];

        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (!targets || targets.length === 0) { return; }
          MOVE_CARDS(store, state, opponent.active, targets[0], { cards: [energyCard], sourceCard: this });
        });
      });
    }

    // Guard Claw
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.damageReductionNextTurn = 30;
    }

    return state;
  }
}
