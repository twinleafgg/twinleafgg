import { AttachEnergyPrompt, CardType, EnergyCard, EnergyType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StoreLike, SuperType } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { ABILITY_USED, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Trapinch extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +10 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Gather Sand',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Trapinch is your Active Pokémon, you may search your discard pile for a basic Fighting Energy card and attach it to Trapinch.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Grind',
    cost: [C],
    damage: 10,
    damageCalculation: 'x',
    text: 'Does 10 damage times the amount of Energy attached to Trapinch.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'Trapinch';
  public fullName: string = 'Trapinch RR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gather Sand
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (!player.discard.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fighting Energy')) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          store.reduceEffect(state, new AttachEnergyEffect(player, transfer.card as EnergyCard, player.active));
        }
      });
    }

    // Grind
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);
      effect.damage = 10 * checkProvidedEnergyEffect.energyMap.reduce((left, p) => left + p.provides.length, 0);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
