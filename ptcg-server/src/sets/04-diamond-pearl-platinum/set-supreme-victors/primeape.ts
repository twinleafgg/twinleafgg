import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Primeape extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Mankey';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Top Drop',
    cost: [C, C],
    damage: 0,
    text: 'Discard the top card from your opponent\'s deck. If you discarded a Pokémon, this attack does damage equal to the HP of that Pokémon.'
  }, {
    name: 'Brick Break',
    cost: [F, C],
    damage: 40,
    text: 'This attack\'s damage isn\'t affected by Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Primeape';
  public fullName: string = 'Primeape SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Top Drop
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      if (opponent.deck.cards.length === 0) {
        return state;
      }
      const topCard = opponent.deck.cards[0];
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, { cards: [topCard], sourceCard: this });
      if (topCard instanceof PokemonCard) {
        effect.damage = topCard.hp;
      }
    }

    // Brick Break
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, 40);
    }

    return state;
  }
}
