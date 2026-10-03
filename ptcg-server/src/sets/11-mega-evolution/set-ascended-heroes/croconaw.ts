import { PokemonCard, Stage, CardType, StoreLike, State, DiscardEnergyPrompt, GameMessage, PlayerType, SlotType, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Croconaw extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Totodile';
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C, C];

  public attacks = [{
    name: 'Crunch',
    cost: [W, W],
    damage: 50,
    text: 'Flip a coin. If heads, discard an Energy from your opponent\'s Active Pokémon.'
  }];

  public regulationMark = 'I';

  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Croconaw';
  public fullName: string = 'Croconaw MC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (AFTER_ATTACK(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, (result) => {
        if (result) {
          return store.prompt(state, new DiscardEnergyPrompt(
            effect.player.id,
            GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
            PlayerType.TOP_PLAYER,
            [SlotType.ACTIVE],
            {},
            { allowCancel: false, min: 1, max: 1 }
          ), transfers => {
            transfers = transfers || [];
            if (transfers.length > 0) {
              const target = StateUtils.getTarget(state, effect.opponent, transfers[0].from);
              MOVE_CARDS(store, state, target, effect.opponent.discard, { cards: [transfers[0].card], sourceCard: this });
            }
          });
        }
      });
    }
    return state;
  }
}