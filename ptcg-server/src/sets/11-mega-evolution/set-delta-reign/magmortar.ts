import {
  AttachEnergyPrompt,
  CardType,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  IS_ABILITY_BLOCKED,
  REMOVE_MARKER_AT_END_OF_TURN,
  USE_ABILITY_ONCE_PER_TURN,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magmortar extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Magmar';
  public cardType: CardType[] = [R];
  public hp: number = 140;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Buddy Boost',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, you may attach up to 1 Basic [R] Energy and up to 1 Basic [L] Energy from your hand to your Magmortar or Electivire in any way you like.'
  }];

  public attacks = [{
    name: 'Heat Stamp',
    cost: [R, R, C],
    damage: 80,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Magmortar';
  public fullName: string = 'Magmortar M6';

  public readonly BUDDY_BOOST_MARKER = 'MAGMORTAR_BUDDY_BOOST_MARKER';
  private readonly VALID_POKEMON_NAMES = ['Magmortar', 'Electivire'];

  private getBlockedTargets(player: Player) {
    const blockedTo: { player: PlayerType; slot: SlotType; index: number }[] = [];
    const activePokemon = player.active.getPokemonCard();

    if (!activePokemon || !this.VALID_POKEMON_NAMES.includes(activePokemon.name)) {
      blockedTo.push({ player: PlayerType.BOTTOM_PLAYER, slot: SlotType.ACTIVE, index: 0 });
    }

    player.bench.forEach((bench, index) => {
      const pokemon = bench.getPokemonCard();
      if (!pokemon || !this.VALID_POKEMON_NAMES.includes(pokemon.name)) {
        blockedTo.push({ player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index });
      }
    });
    return blockedTo;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Buddy Boost
    // Ref: set-unified-minds/haxorus.ts (validCardTypes for multiple Basic types in one prompt)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      let hasValidTarget = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const pokemon = cardList.getPokemonCard();
        if (pokemon && this.VALID_POKEMON_NAMES.includes(pokemon.name)) {
          hasValidTarget = true;
        }
      });

      if (!hasValidTarget) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.BUDDY_BOOST_MARKER, this);
      ABILITY_USED(player, this);

      const hasValidEnergy = player.hand.cards.some(
        c => c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && c.provides.some(p => p === CardType.FIRE || p === CardType.LIGHTNING),
      );

      if (!hasValidEnergy) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        {
          allowCancel: true,
          min: 0,
          max: 2,
          blockedTo: this.getBlockedTargets(player),
          validCardTypes: [CardType.FIRE, CardType.LIGHTNING],
          maxPerType: 1,
        },
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.BUDDY_BOOST_MARKER, this);

    return state;
  }
}
