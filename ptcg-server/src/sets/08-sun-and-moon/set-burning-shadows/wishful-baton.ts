import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { StateUtils } from '../../../game/store/state-utils';
import { IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CardList } from '../../../game/store/state/card-list';

export class WishfulBaton extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'BUS';

  public name: string = 'Wishful Baton';

  public fullName: string = 'Wishful Baton BUS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '128';

  public text: string =
    "If the Pokémon this card is attached to is your Active Pokémon and is Knocked Out by damage from an opponent's attack, move up to 3 basic Energy cards from that Pokémon to 1 of your Benched Pokémon.";

  public readonly WISHFUL_BATON_MARKER: string = 'WISHFUL_BATON_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const active = effect.target;

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      if (active.marker.hasMarker(this.WISHFUL_BATON_MARKER)) {
        return state;
      }

      // Check if this tool is attached to the active Pokemon
      if (!active.tools.includes(this)) {
        return state;
      }

      // Get all basic energy cards from the active Pokemon
      const basicEnergyCards = active.cards.filter(
        (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
      );

      if (basicEnergyCards.length === 0) {
        return state;
      }

      // Add marker, do not invoke this effect for other wishful batons
      active.marker.addMarker(this.WISHFUL_BATON_MARKER, this);

      // Make copy of the basic energy cards, because they will be transferred to discard shortly
      const energyToAttach = new CardList();
      energyToAttach.cards = basicEnergyCards.slice();

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          energyToAttach,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: true, min: 0, max: 3, sameTarget: true },
        ),
        (transfers) => {
          transfers = transfers || [];
          active.marker.removeMarker(this.WISHFUL_BATON_MARKER);

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card] });
          }
        },
      );
    }

    return state;
  }
}
