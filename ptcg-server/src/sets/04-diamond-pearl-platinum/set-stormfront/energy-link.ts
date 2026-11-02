import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { SuperType } from '../../../game';
import { CardTarget } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { MoveEnergyPrompt } from '../../../game';
import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerPowerEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EnergyLink extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Energy Link';
  public fullName: string = 'Energy Link SF';
  public text: string = 'Attach Energy Link to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. As long as Energy Link is attached to a Pokémon, you may move an Energy card attached to that Pokémon to another of your Pokémon that has Energy Link attached to it. You may use this effect as often as you like during your turn.';

  public powers = [{
    // Energy Link
    name: 'Energy Link',
    useWhenInPlay: true,
    powerType: PowerType.TRAINER_ABILITY,
    text: 'Move an Energy card attached to the Pokémon this card is attached to to another of your Pokémon that has Energy Link attached to it.'
  }];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerPowerEffect && effect.card === this) {
      const player = effect.player;
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (!list.tools.includes(this)) {
          blockedFrom.push(target);
          blockedTo.push(target);
        }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 1, max: 1, blockedFrom, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          if (source !== target && source.tools.includes(this) && target.tools.includes(this)) {
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        }
      });
    }

    return state;
  }
}
