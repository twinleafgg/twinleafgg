import { CardType, EnergyCard, GameError, GameMessage, PokemonCard, PowerType, Stage, State, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, HEAL_X_DAMAGE_FROM_THIS_POKEMON, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Starmie extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Staryu';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [];

  public powers = [{
    name: 'Aqua Recycle',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your discard pile for a Water Energy card, show it to your opponent, and put it into your hand. This power can\'t be used if Starmie is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Synchro Gain',
    cost: [C],
    damage: 20,
    text: 'If Starmie and the Defending Pokémon have the same amount of Energy attached to them, remove 4 damage counters from Starmie.'
  },
  {
    name: 'Powerful Spin',
    cost: [W],
    damage: 40,
    text: 'Starmie can\'t attack during your next turn.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Starmie';
  public fullName: string = 'Starmie RR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aqua Recycle
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (!player.discard.cards.some(c => c instanceof EnergyCard && c.name === 'Water Energy')) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.ENERGY, name: 'Water Energy' },
        { min: 1, max: 1, allowCancel: false }
      );
    }

    // Synchro Gain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const playerEnergy = effect.player.active.cards.filter(c => c.superType === SuperType.ENERGY).length;
      const opponentEnergy = effect.opponent.active.cards.filter(c => c.superType === SuperType.ENERGY).length;
      if (playerEnergy === opponentEnergy) {
        HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 40);
      }
    }

    // Powerful Spin
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
