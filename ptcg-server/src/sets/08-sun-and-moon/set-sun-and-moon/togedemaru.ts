import { CardType, EnergyCard, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {COIN_FLIP_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Togedemaru extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Defense Curl',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, prevent all damage done to this Pokémon by attacks during your opponent\'s next turn.'
  }, {
    name: 'Discharge',
    cost: [L],
    damage: 30,
    damageCalculation: 'x',
    text: 'Discard all [L] Energy from this Pokémon. This attack does 30 damage for each card you discarded in this way.'
  }];

  public set: string = 'SUM';
  public setNumber: string = '53';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Togedemaru';
  public fullName: string = 'Togedemaru SUM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Defense Curl
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          PREVENT_DAMAGE(store, state, effect, this);
        }
      });
    }

    // Discharge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const cards = player.active.cards.filter(c =>
        c instanceof EnergyCard && c.provides.includes(CardType.LIGHTNING)
      );
      const discardCount = cards.length;
      cards.forEach(c => { MOVE_CARDS(store, state, player.active, player.discard, { cards: [c], sourceCard: this }); });
      effect.damage = 30 * discardCount;
    }

    return state;
  }
}
