import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, MOVE_CARDS, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

const FOSSIL_NAMES = ['Helix Fossil', 'Dome Fossil', 'Old Amber'];

export class Kabutops extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Kabuto';
  public hp: number = 130;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Primal Scythe',
    cost: [F],
    damage: 20,
    damageCalculation: '+',
    text: 'You may discard Helix Fossil, Dome Fossil, or Old Amber from your hand. If you do, this attack does 20 damage plus 50 more damage.'
  }, {
    name: 'Rock Slide',
    cost: [F, C, C],
    damage: 60,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Kabutops';
  public fullName: string = 'Kabutops AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Primal Scythe
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const fossils = player.hand.cards.filter(c => FOSSIL_NAMES.includes(c.name));
      if (fossils.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        const blocked: number[] = [];
        player.hand.cards.forEach((card, index) => {
          if (!FOSSIL_NAMES.includes(card.name)) {
            blocked.push(index);
          }
        });
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.TRAINER },
          { min: 1, max: 1, allowCancel: false, blocked }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
            effect.damage += 50;
          }
        });
      });
    }

    // Rock Slide
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const benchCount = effect.opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchCount > 0) {
        const count = Math.min(2, benchCount);
        THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, count, count);
      }
    }

    return state;
  }
}
