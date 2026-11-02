import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, BLOCK_IF_DECK_EMPTY, BLOCK_IF_HAS_SPECIAL_CONDITION, COIN_FLIP_PROMPT, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, SEARCH_DECK_FOR_CARDS_TO_HAND, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

const FOSSIL_NAMES = ['Helix Fossil', 'Dome Fossil', 'Old Amber'];

export class Aerodactyl extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Old Amber';
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Unearth',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your deck for Helix Fossil, Dome Fossil, or Old Amber, show it your opponent, and put it into your hand. Shuffle your deck afterward. This power can\'t be used if Aerodactyl is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Hyper Beam',
    cost: [C, C],
    damage: 30,
    text: 'Flip a coin. If heads, discard an Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Aerodactyl';
  public fullName: string = 'Aerodactyl AR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Unearth
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      BLOCK_IF_DECK_EMPTY(player);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!FOSSIL_NAMES.includes(card.name)) {
          blocked.push(index);
        }
      });
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.TRAINER },
        { min: 0, max: 1, allowCancel: false, blocked },
        this.powers[0]
      );
      return state;
    }

    // Hyper Beam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
