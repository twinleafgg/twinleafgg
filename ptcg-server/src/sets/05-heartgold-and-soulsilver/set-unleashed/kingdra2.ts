import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kingdra2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Seadra';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Water Arrow',
    cost: [W],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Stream Pump',
    cost: [W, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'You may do 50 damage plus 30 more damage. If you do, return an Energy card attached to Kingdra to your hand.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Kingdra';
  public fullName: string = 'Kingdra UL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Arrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    // Stream Pump
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasEnergy = player.active.cards.some(c => c.superType === SuperType.ENERGY);
      if (!hasEnergy) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, wantTo => {
        if (!wantTo) {
          return;
        }
        effect.damage += 30;
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.active,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards: Card[] = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.active, player.hand, { cards, sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
