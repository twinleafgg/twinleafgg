import { ChooseCardsPrompt, EnergyCard, GameMessage, State, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Golem extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Graveler';
  public hp: number = 140;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Lunge Out',
    cost: [F, C],
    damage: 50,
    text: ''
  }, {
    name: 'Tumble Down',
    cost: [F, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Discard as many Fighting Energy cards as you like from your hand. The attack does 30 damage times the number of Fighting Energy cards you discarded.'
  }, {
    name: 'Rock Tumble',
    cost: [F, F, C, C],
    damage: 80,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Golem';
  public fullName: string = 'Golem AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Tumble Down
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const fightingEnergy = player.hand.cards.filter(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fighting Energy'
      );
      if (fightingEnergy.length === 0) {
        effect.damage = 0;
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { min: 0, max: fightingEnergy.length, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        effect.damage = cards.length * 30;
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        }
      });
    }

    // Rock Tumble
    if (WAS_ATTACK_USED(effect, 2, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}
