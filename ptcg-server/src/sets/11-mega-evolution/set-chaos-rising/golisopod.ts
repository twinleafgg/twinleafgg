import { PokemonCard, PokemonCardList, Stage, CardType, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutAttackEffect } from '../../../game/store/effects/game-effects';
import { THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Golisopod extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Wimpod';
  public hp: number = 140;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Critical Slash',
    cost: [W],
    damage: 30,
    text: 'If your opponent\'s Pokémon is Knocked Out by damage from this attack, during your opponent\'s next turn, prevent all damage from and effects of attacks done to this Pokémon.',
  },
  {
    name: 'Boundless Power',
    cost: [C, C, C],
    damage: 150,
    text: 'During your next turn, this Pokémon can\'t use attacks.',
  }];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name: string = 'Golisopod';
  public fullName: string = 'Golisopod M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Critical Slash
    if (effect instanceof KnockOutAttackEffect && effect.attack === this.attacks[0]) {
      if (!effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const cardOwner = StateUtils.findOwner(state, cardList);
      if (effect.player !== cardOwner) {
        cardList.preventDamageNextTurnPending = {};
        cardList.preventEffectsOfAttacksNextTurnPending = {};
      }
    }

    // Boundless Power
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}
