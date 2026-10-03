import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, EnergyType, SuperType } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  PlayerType,
  AttachEnergyPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  SlotType,
  CardTarget,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Latias extends PokemonCard {
  protected _tags = [CardTag.FUSION_STRIKE];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 120;
  public retreat = [C];

  public readonly RED_ASSIST_MARKER = 'LATIAS_FST_RED_ASSIST_MARKER';

  public powers = [{
    name: 'Red Assist',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may attach a [P] Energy card from your hand to 1 of your Latios.'
  }];

  public attacks = [{
    name: 'Dyna Barrier',
    cost: [R, P, C],
    damage: 70,
    text: 'During your opponent\'s next turn, prevent all damage done to this Pokémon by attacks from Pokémon VMAX.'
  }];

  public regulationMark: string = 'E';
  public set: string = 'FST';
  public setNumber: string = '193';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Latias';
  public fullName: string = 'Latias FST 193';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Red Assist
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.RED_ASSIST_MARKER, this);

      const hasPsychicInHand = player.hand.cards.some(
        (c) => c instanceof EnergyCard && c.provides.includes(CardType.PSYCHIC),
      );
      if (!hasPsychicInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let hasLatios = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.name === 'Latios') {
          hasLatios = true;
        }
      });
      if (!hasLatios) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (card.name !== 'Latios') {
          blockedTo.push(target);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          {
            superType: SuperType.ENERGY,
            energyType: EnergyType.BASIC,
            provides: [CardType.PSYCHIC],
          },
          { allowCancel: true, min: 1, max: 1, blockedTo },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.RED_ASSIST_MARKER, this);

    // Dyna Barrier
    if (WAS_ATTACK_USED(effect, 0, this)) {
      PREVENT_DAMAGE(store, state, effect, this, { sourceTags: [CardTag.POKEMON_VMAX] });
    }

    return state;
  }
}
