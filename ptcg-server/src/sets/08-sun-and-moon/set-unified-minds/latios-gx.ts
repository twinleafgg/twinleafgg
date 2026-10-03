import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, StoreLike, State, GameError, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED, IS_ABILITY_BLOCKED, BLOCK_IF_GX_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { OPPONENT_CANNOT_USE_GX_ATTACKS_FOR_REST_OF_GAME, PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class LatiosGx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 170;
  public weakness = [{ type: P }];
  public retreat = [];

  public powers = [{
    name: 'Power Bind',
    powerType: PowerType.ABILITY,
    text: "If you have 4 or fewer Pokemon in play, this Pokemon can't attack.",
  }];

  public attacks = [{
    name: 'Tag Purge',
    cost: [P, C, C],
    damage: 120,
    text: 'During your opponent\'s next turn, prevent all damage done to this Pokemon by attacks from TAG TEAM Pokemon.'
  },
  {
    name: 'Clear Vision-GX',
    cost: [P],
    damage: 0,
    text: 'For the rest of this game, your opponent can\'t use any GX attacks. (You can\'t use more than 1 GX attack in a game.)'
  }];

  public set: string = 'UNM';
  public setNumber: string = '78';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Latios-GX';
  public fullName: string = 'Latios-GX UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Power Bind
    if (effect instanceof AttackEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      let pokemonCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, () => {
        pokemonCount++;
      });

      if (pokemonCount <= 4) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    // Tag Purge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      PREVENT_DAMAGE(store, state, effect, this, { sourceTags: [CardTag.TAG_TEAM] });
    }

    // Clear Vision-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;
      OPPONENT_CANNOT_USE_GX_ATTACKS_FOR_REST_OF_GAME(effect);
    }

    return state;
  }
}
