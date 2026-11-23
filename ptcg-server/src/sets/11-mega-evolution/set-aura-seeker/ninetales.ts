import { CardType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ninetales extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Vulpix';
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Deception',
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon is Knocked Out, and if you have exactly 5 cards in your hand, your opponent can\'t take any Prize cards for it.'
  }];

  public attacks = [{
    name: 'Searing Flame',
    cost: [R],
    damage: 40,
    text: 'Your opponent\'s Active Pokémon is now Burned.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Ninetales';
  public fullName: string = 'Ninetales FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Deception
    if (
      effect instanceof KnockOutEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player.hand.cards.length === 5) {
        effect.prizeCount = 0;
      }
    }

    // Searing Flame
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    return state;
  }
}
