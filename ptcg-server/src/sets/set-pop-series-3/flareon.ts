import { PokemonCard, CardType, EnergyType, Stage, SuperType, ChooseCardsPrompt, EnergyCard, GameMessage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Flareon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    // Quick Attack
    name: 'Quick Attack',
    cost: [C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 20 more damage.'
  }, {
    // Fire Spin
    name: 'Fire Spin',
    cost: [R, R, C],
    damage: 70,
    text: 'Discard 2 basic Energy cards attached to Flareon or this attack does nothing.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Flareon';
  public fullName: string = 'Flareon P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quick Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }
    // Fire Spin
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const basicEnergy = player.active.cards.filter(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC);
      if (basicEnergy.length < 2) {
        effect.damage = 0;
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.active,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 2, max: 2, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length < 2) {
          effect.damage = 0;
          return;
        }
        MOVE_CARDS(store, state, player.active, player.discard, { cards, sourceCard: this });
      });
    }
    return state;
  }
}
