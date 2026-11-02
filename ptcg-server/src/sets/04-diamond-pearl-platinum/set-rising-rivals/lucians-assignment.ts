import { GameError, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class LuciansAssignment extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Lucian\'s Assignment';
  public fullName: string = 'Lucian\'s Assignment RR';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Move as many Energy cards attached to 1 of your Pokémon as you like to another of your Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      let pokemonCount = 0;
      let pokemonWithEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        pokemonCount += 1;
        if (cardList.cards.some(c => c.superType === SuperType.ENERGY)) {
          pokemonWithEnergy += 1;
        }
      });

      if (pokemonCount < 2 || pokemonWithEnergy === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 1, allowCancel: pokemonWithEnergy <= 1 }
      ), transfers => {
        if (transfers === null) {
          return;
        }
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}
