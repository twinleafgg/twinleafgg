import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_POKEMON_OFF_BOARD, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Clefable extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Clefairy';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Fairy Power',
    cost: [C, C],
    damage: 0,
    text: 'Return 1 of your Pokémon and all cards attached to it to your hand.'
  },
  {
    name: 'Moon Impact',
    cost: [C, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Clefable';
  public fullName: string = 'Clefable HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fairy Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false },
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        MOVE_POKEMON_OFF_BOARD(store, state, targets[0], {
          pokemonDestination: player.hand,
          sourceCard: this,
        });
      });
    }

    return state;
  }
}
