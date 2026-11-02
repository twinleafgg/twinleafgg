import { Card, ChooseCardsPrompt, EnergyCard, GameMessage, PlayerType, PokemonCard, State, StateUtils, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_MARKER, HAS_MARKER, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Breloom extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shroomish';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Hover Hit',
    cost: [F],
    damage: 40,
    text: 'The Retreat Cost for the Defending Pokémon is 0 until the end of your next turn.'
  }, {
    name: 'Crash Bomber',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If the Defending Pokémon has any Special Energy cards attached to it, this attack does 20 damage plus 40 more damage. Then, discard a Special Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Breloom';
  public fullName: string = 'Breloom SV';

  public readonly HOVER_HIT_MARKER = 'HOVER_HIT_MARKER';
  public readonly HOVER_HIT_CLEAR_MARKER = 'HOVER_HIT_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hover Hit
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.HOVER_HIT_MARKER, effect.opponent.active, this);
      REMOVE_MARKER(this.HOVER_HIT_CLEAR_MARKER, effect.player, this);
      ADD_MARKER(this.HOVER_HIT_MARKER, effect.player, this);
    }

    if (effect instanceof CheckRetreatCostEffect && HAS_MARKER(this.HOVER_HIT_MARKER, effect.player.active, this)) {
      effect.cost = [];
    }

    if (effect instanceof EndTurnEffect && HAS_MARKER(this.HOVER_HIT_MARKER, effect.player, this)) {
      if (HAS_MARKER(this.HOVER_HIT_CLEAR_MARKER, effect.player, this)) {
        const opponent = StateUtils.getOpponent(state, effect.player);
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
          REMOVE_MARKER(this.HOVER_HIT_MARKER, cardList, this);
        });
        REMOVE_MARKER(this.HOVER_HIT_MARKER, effect.player, this);
        REMOVE_MARKER(this.HOVER_HIT_CLEAR_MARKER, effect.player, this);
      } else {
        ADD_MARKER(this.HOVER_HIT_CLEAR_MARKER, effect.player, this);
      }
    }

    // Crash Bomber
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const specialEnergy = opponent.active.cards.filter(
        c => c instanceof EnergyCard && c.energyType === EnergyType.SPECIAL
      );
      if (specialEnergy.length === 0) {
        return state;
      }
      effect.damage += 40;
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.active,
        { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length > 0) {
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = opponent.active;
          store.reduceEffect(state, discardEnergy);
        }
      });
    }

    return state;
  }
}
