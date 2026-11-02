import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, COIN_FLIP_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Marshtomp extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Mudkip';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Plunge',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), if Marshtomp is on your Bench, you may flip a coin. If heads, move all Energy cards attached to your Active Pokémon to Marshtomp. If you do, switch Marshtomp with that Active Pokémon.'
  }];

  public attacks = [{
    name: 'Mud Shot',
    cost: [C, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Marshtomp';
  public fullName: string = 'Marshtomp SV';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Plunge
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const marshtompSlot = StateUtils.findPokemonSlot(state, this);
      if (!marshtompSlot || marshtompSlot === player.active) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        const energyCards = player.active.cards.filter(c => c.superType === SuperType.ENERGY);
        if (energyCards.length > 0) {
          MOVE_CARDS(store, state, player.active, marshtompSlot, { cards: energyCards, sourceCard: this });
        }
        player.switchPokemon(marshtompSlot, store, state);
      });
      return state;
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
