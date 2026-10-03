import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED, ADD_MARKER, BLOCK_IF_HAS_SPECIAL_CONDITION, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Gardevoir extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Kirlia';
  public cardType: CardType[] = [P];
  public hp: number = 10;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [{
    name: 'Psy Shadow',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your deck for a [P] Energy card and attach it to 1 of your Pokémon. Put 2 damage counters on that Pokémon. Shuffle your deck afterward. This power can\'t be used if Gardevoir is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Energy Burst',
    cost: [P],
    damage: 10,
    damageCalculation: 'x',
    text: 'Does 10 damage times the total amount of Energy attached to Gardevoir and the Defending Pokémon.'
  }];

  public set: string = 'RS';
  public name: string = 'Gardevoir';
  public fullName: string = 'Gardevoir RS';
  public setNumber: string = '7';
  public cardImage: string = 'assets/cardback.png';

  public readonly PSY_SHADOW_MARKER = 'PSY_SHADOW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      if (HAS_MARKER(this.PSY_SHADOW_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ABILITY_USED(player, this);
      ADD_MARKER(this.PSY_SHADOW_MARKER, player, this);

      store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, name: 'Psychic Energy' },
        { allowCancel: false, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          target.damage += 20; // Add 2 damage counters
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PSY_SHADOW_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const player = effect.player;

      const checkProvidedEnergyOpponent = new CheckProvidedEnergyEffect(opponent, opponent.active);
      const checkProvidedEnergyPlayer = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyOpponent);
      store.reduceEffect(state, checkProvidedEnergyPlayer);

      const totalEnergy = checkProvidedEnergyOpponent.energyMap.length + checkProvidedEnergyPlayer.energyMap.length;

      const damagePerEnergy = 10;
      effect.damage = totalEnergy * damagePerEnergy;
    }

    return state;
  }

}
