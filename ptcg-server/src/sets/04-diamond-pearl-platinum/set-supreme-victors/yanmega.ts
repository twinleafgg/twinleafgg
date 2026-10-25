import { EnergyCard, GameError, GameMessage, PokemonCard, PowerType, SlotType, State, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON, BLOCK_IF_HAS_SPECIAL_CONDITION, CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Yanmega extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Yanma';
  public hp: number = 100;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Speed Boost',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Yanmega is your Active Pokémon, you may search your discard pile for a Grass Energy card and attach it to Yanmega. This power can\'t be used if Yanmega is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Wind Return',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'You may return all Grass Energy attached to Yanmega to your hand. If you do, this attack does 20 damage plus 20 more damage for each Energy card you returned.'
  }, {
    name: 'Speed Dive',
    cost: [G, G, C, C],
    damage: 70,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Yanmega';
  public fullName: string = 'Yanmega SV';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Speed Boost
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      const hasGrassEnergy = player.discard.cards.some(c =>
        c instanceof EnergyCard && (c.name === 'Grass Energy' || c.provides.includes(CardType.GRASS))
      );
      if (!hasGrassEnergy) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(store, state, player, 1, CardType.GRASS, {
        destinationSlots: [SlotType.ACTIVE],
        targetFilter: (_list, card) => card === this,
        energyFilter: { energyType: EnergyType.BASIC, name: 'Grass Energy' },
        min: 1,
        allowCancel: false,
      });
    }

    // Wind Return
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const grassEnergies = player.active.cards.filter(c =>
        c instanceof EnergyCard && (c.name === 'Grass Energy' || c.provides.includes(CardType.GRASS))
      );
      if (grassEnergies.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) {
          MOVE_CARDS(store, state, player.active, player.hand, { cards: grassEnergies, sourceCard: this, sourceEffect: this.attacks[0] });
          effect.damage += 20 * grassEnergies.length;
        }
      }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
