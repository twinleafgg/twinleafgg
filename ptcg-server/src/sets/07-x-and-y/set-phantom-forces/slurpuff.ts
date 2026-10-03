import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PlayerType, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Slurpuff extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [Y];
  public hp: number = 90;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C];
  public evolvesFrom = 'Swirlix';

  public powers = [{
    name: 'Tasting',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may draw a card. If this Pokémon is your Active Pokémon, draw 1 more card.'
  }];

  public attacks = [{
    name: 'Light Pulse',
    cost: [Y, C, C],
    damage: 60,
    text: 'Prevent all effects of your opponent\'s attacks, except damage, done to this Pokémon during your opponent\'s next turn.'
  }];

  public set: string = 'PHF';
  public name: string = 'Slurpuff';
  public fullName: string = 'Slurpuff PHF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '69';

  public readonly TASTING_MARKER = 'TASTING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Check to see if anything is blocking our Ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player.marker.hasMarker(this.TASTING_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const isActive = player.active.getPokemonCard() === this;

      if (isActive) {
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
      } else {
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      }

      player.marker.addMarker(this.TASTING_MARKER, this);

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.TASTING_MARKER);
      return state;
    }

    return state;
  }
}