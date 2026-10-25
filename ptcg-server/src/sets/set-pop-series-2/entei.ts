import { PokemonCard, CardType, EnergyType, Stage, SuperType, ChooseCardsPrompt, EnergyCard, GameMessage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Entei extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    // Stomp
    name: 'Stomp',
    cost: [C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 20 more damage.'
  }, {
    // Fire Spin
    name: 'Fire Spin',
    cost: [R, R, C],
    damage: 50,
    text: 'Discard 2 Basic Energy cards attached to Entei or this attack does nothing.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Entei';
  public fullName: string = 'Entei P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stomp
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
