import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DAMAGE_OPPONENT_POKEMON, FLIP_UNTIL_TAILS_AND_COUNT_HEADS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Primeape extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Mankey';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Low Kick',
    cost: [C, C],
    damage: 30,
    text: ''
  },
  {
    name: 'Bebop Punch',
    cost: [F, F],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. Flip a coin until you get tails. This attack does 50 damage times the number of heads to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Primeape';
  public fullName: string = 'Primeape UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bebop Punch
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        if (targets.length === 0) {
          return;
        }
        FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, heads => {
          DAMAGE_OPPONENT_POKEMON(store, state, effect, 50 * heads, targets);
        });
      });
    }

    return state;
  }
}
