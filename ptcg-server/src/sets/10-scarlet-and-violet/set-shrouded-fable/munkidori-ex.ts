import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PowerType } from '../../../game';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Munkidoriex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public hp: number = 210;
  public retreat = [C];

  public powers = [
    {
      name: "Oh No You Don't",
      powerType: PowerType.ABILITY,
      text: "If this Pokémon is Knocked Out by damage from an attack from your opponent's Pokémon, and if you have any Pecharunt ex in play, your opponent takes 1 fewer Prize card.",
    },
  ];

  public attacks = [
    {
      name: 'Dirty Headbutt',
      cost: [D, D, C],
      damage: 190,
      text: "During your next turn, this Pokémon can't use Dirty Headbutt.",
    },
  ];

  public regulationMark = 'H';
  public set: string = 'SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Munkidori ex';
  public fullName: string = 'Munkidori ex SFA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }

      if (player.pecharuntexIsInPlay == true) {
        effect.prizeCount -= 1;
      }
    }

    // Dirty Headbutt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!player.active.cannotUseAttacksNextTurnPending.includes('Dirty Headbutt')) {
        player.active.cannotUseAttacksNextTurnPending.push('Dirty Headbutt');
      }
    }

    return state;
  }
}
