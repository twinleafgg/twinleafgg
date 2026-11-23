import { BoardEffect, CardTarget, CardType, EnergyType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import {
  ADD_MARKER,
  ATTACH_ENERGY_PROMPT,
  HAS_MARKER,
  IS_ABILITY_BLOCKED,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class Falinks extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'Solidarity Formation',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. For each of your Benched Pokémon that has "Falinks" in its name, search your deck for a Basic [F] Energy card and attach it to that Pokémon. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Strong Attack',
    cost: [F, F, F],
    damage: 120,
    text: 'Discard an Energy from this Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '47';
  public name: string = 'Falinks';
  public fullName: string = 'Falinks FLO';

  public readonly SOLIDARITY_FORMATION_MARKER = 'SOLIDARITY_FORMATION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Solidarity Formation
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (HAS_MARKER(this.SOLIDARITY_FORMATION_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const benchedFalinks: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card, target) => {
        if (target.slot === SlotType.BENCH && card.name.includes('Falinks')) {
          benchedFalinks.push(target);
        }
      });

      if (benchedFalinks.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, _card, target) => {
        if (!benchedFalinks.some(t => t.slot === target.slot && t.index === target.index && t.player === target.player)) {
          blockedTo.push(target);
        }
      });

      ADD_MARKER(this.SOLIDARITY_FORMATION_MARKER, player, this);
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DECK,
        [SlotType.BENCH],
        { energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { min: 0, max: benchedFalinks.length, allowCancel: false, blockedTo, differentTargets: true },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.SOLIDARITY_FORMATION_MARKER, this);

    // Strong Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    return state;
  }
}
