import { CardType, ChooseCardsPrompt, GameMessage, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DEFENDING_POKEMON_TAKES_MORE_DAMAGE_DURING_YOUR_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, MOVE_CARDS, ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sharpedo extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Carvanha';
  public hp: number = 90;
  public cardType: CardType[] = [D];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Energy Shark',
    powerType: PowerType.POKEBODY,
    text: 'If Sharpedo is your Active Pokémon and is damaged by an opponent\'s attack (even if Sharpedo is Knocked Out), flip a coin. If heads, discard an Energy card attached to the Attacking Pokémon.'
  }];

  public attacks = [{
    name: 'Crunch',
    cost: [D, C],
    damage: 20,
    text: 'If an attack does damage to the Defending Pokémon (after applying Weakness and Resistance), that attack does 40 more damage to that Pokémon until the end of your next turn.'
  },
  {
    name: 'Sharp Fang',
    cost: [D, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '49';
  public name: string = 'Sharpedo';
  public fullName: string = 'Sharpedo RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Shark
    if (ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT(state, effect, { source: this })) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }

      COIN_FLIP_PROMPT(store, state, owner, result => {
        if (!result) {
          return;
        }
        const attacking = effect.source;
        if (!attacking.cards.some(c => c.superType === SuperType.ENERGY)) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          owner,
          GameMessage.CHOOSE_ENERGY_TO_DISCARD,
          attacking,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            const attackingOwner = StateUtils.findOwner(state, attacking);
            MOVE_CARDS(store, state, attacking, attackingOwner.discard, { cards, sourceCard: this });
          }
        });
      });
    }

    // Crunch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DEFENDING_POKEMON_TAKES_MORE_DAMAGE_DURING_YOUR_NEXT_TURN(store, state, effect, this, 40);
    }

    return state;
  }
}
