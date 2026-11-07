import { AttachEnergyPrompt, CardType, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Azurill extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 30;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [{
    name: 'Bouncy-Bounce Charge',
    cost: [],
    damage: 0,
    text: 'Search your deck for an Energy card and attach it to 1 of your Benched Pokémon. Then, shuffle your deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Azurill';
  public fullName: string = 'Azurill M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Charge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: 1 },
      ), transfers => {
        transfers = transfers || [];

        if (transfers.length === 0) {
          SHUFFLE_DECK(store, state, player);
          return;
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
        }

        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}