import {ABILITY_USED, ADD_MARKER, ADD_SLEEP_TO_PLAYER_ACTIVE, AFTER_ATTACK, BLOCK_IF_HAS_SPECIAL_CONDITION, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyPrompt, EnergyCard, PlayerType, PowerType, SlotType, State, StoreLike } from '../../../game';
export class Swampert extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Marshtomp';
  public cardType: CardType[] = [W];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Water Call',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may attach a [W] Energy card from your hand to your Active Pokémon. This power can\'t be used if Swampert is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Hypno Splash',
    cost: [W, W, C, C],
    damage: 50,
    text: 'The Defending Pokémon is now Asleep.'
  }];

  public set: string = 'RS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Swampert';
  public fullName: string = 'Swampert RS';

  public readonly WATER_CALL_MARKER = 'WATER_CALL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.WATER_CALL_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!player.hand.cards.some(card => card.superType === SuperType.ENERGY && (card as EnergyCard).provides.includes(CardType.WATER))) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      if (HAS_MARKER(this.WATER_CALL_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ABILITY_USED(player, this);
      ADD_MARKER(this.WATER_CALL_MARKER, player, this);

      store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, name: 'Water Energy' },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    return state;
  }
}