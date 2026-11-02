import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, JUST_EVOLVED, SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Froslass extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Snorunt';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Snow Gift',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you play Froslass from your hand to evolve 1 of your Pokémon, you may search your deck for any 1 card and put it into your hand. Shuffle your deck afterward.'
  }];

  public attacks = [{
    name: 'Ground Frost',
    cost: [W, C],
    damage: 50,
    text: 'If there is any Stadium Card in play, this attack does nothing.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Froslass';
  public fullName: string = 'Froslass AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Snow Gift
    if (JUST_EVOLVED(effect, this) && !IS_POKEPOWER_BLOCKED(store, state, effect.player, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          SEARCH_DECK_FOR_CARDS_TO_HAND(store, state, effect.player, this, {}, { min: 1, max: 1 }, this.powers[0]);
        }
      });
    }

    // Ground Frost
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (StateUtils.getStadiumCard(state) !== undefined) {
        effect.damage = 0;
      }
    }

    return state;
  }
}
