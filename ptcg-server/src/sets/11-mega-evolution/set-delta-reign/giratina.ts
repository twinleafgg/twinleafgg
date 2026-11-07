import { CardType, PlayerType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Giratina extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 130;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Chaos Crawler',
    cost: [P, P, C],
    damage: 120,
    text: 'During your opponent\'s next turn, prevent all damage from attacks done to this Pokémon.If 1 of your Pokémon used Chaos Crawler during your last turn, this attack can\'t be used.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Giratina';
  public fullName: string = 'Giratina M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Chaos Crawler.
    if (effect instanceof AttackEffect && effect.attack.name === this.attacks[0].name) {
      const attackName = this.attacks[0].name;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (!cardList.cannotUseAttacksNextTurnPending.includes(attackName)) {
          cardList.cannotUseAttacksNextTurnPending.push(attackName);
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      PREVENT_DAMAGE(store, state, effect, this);
    }

    return state;
  }
}