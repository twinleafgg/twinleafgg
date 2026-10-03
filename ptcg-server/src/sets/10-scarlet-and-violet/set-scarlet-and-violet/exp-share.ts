import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import { PlayerType, SlotType, CardTarget } from '../../../game/store/actions/play-card-action';
import { StateUtils } from '../../../game/store/state-utils';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ExpShare extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '174';

  public name: string = 'Exp. Share';

  public fullName: string = 'Exp. Share SVI';

  public text: string =
    "When your Active Pokemon is Knocked Out by damage from an opponent's " +
    'attack, you may move 1 basic Energy card that was attached to that ' +
    'Pokemon to the Pokemon this card is attached to.';

  public readonly EXP_SHARE_MARKER: string = 'EXP_SHARE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect && effect.target === effect.player.active) {
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

      if (active.marker.hasMarker(this.EXP_SHARE_MARKER)) {
        return state;
      }

      let expShareCount = 0;
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === effect.target) {
          return;
        }
        if (cardList.tools.length > 0 && cardList.tools[0] instanceof ExpShare) {
          expShareCount++;
        } else {
          blockedTo.push(target);
        }
      });

      if (expShareCount === 0) {
        return state;
      }

      // Add marker, do not invoke this effect for other exp. share
      active.marker.addMarker(this.EXP_SHARE_MARKER, this);

      // Make copy of the active pokemon cards,
      // because they will be transfered to discard shortly
      const activeCopy = new PokemonCardList();
      activeCopy.cards = player.active.cards.slice();

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          activeCopy,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: true, min: 1, max: expShareCount, differentTargets: true, blockedTo },
        ),
        (transfers) => {
          transfers = transfers || [];
          active.marker.removeMarker(this.EXP_SHARE_MARKER);
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }
        },
      );
    }

    return state;
  }
}
