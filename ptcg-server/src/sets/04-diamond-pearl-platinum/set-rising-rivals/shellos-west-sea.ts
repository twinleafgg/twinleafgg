import { CardType, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ShellosWestSea extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Healing Sea',
    cost: [],
    damage: 0,
    text: 'Flip 2 coins. Choose 1 of your Pokémon. For each heads, remove 1 damage counter from that Pokémon.'
  },
  {
    name: 'Mud Shot',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Shellos West Sea';
  public fullName: string = 'Shellos West Sea RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Healing Sea
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        const heads = results.filter(r => r).length;
        if (heads === 0) {
          return;
        }
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          if (selected && selected.length > 0) {
            store.reduceEffect(state, new HealEffect(player, selected[0], heads * 10));
          }
        });
      });
    }

    return state;
  }
}
