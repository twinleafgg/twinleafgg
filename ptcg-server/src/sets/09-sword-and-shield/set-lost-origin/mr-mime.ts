import { CardType, GameMessage, PokemonCard, SelectPrompt, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class MrMime extends PokemonCard {
  public cardType: CardType[] = [P];
  public hp = 90;
  public stage = Stage.BASIC;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Pound',
    cost: [C],
    damage: 20,
    text: ''
  }, {
    name: 'Tricky Slap',
    cost: [P, C, C],
    damage: 90,
    text: 'You and your opponent play Rock-Paper-Scissors until someone wins. If you win, during your opponent\'s next turn, prevent all damage from and effects of attacks done to this Pokémon.'
  }];

  public regulationMark = 'F';
  public set: string = 'LOR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Mr. Mime';
  public fullName: string = 'Mr. Mime LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Tricky Slap
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const options = [
        { value: 'Rock', message: 'Rock' },
        { value: 'Paper', message: 'Paper' },
        { value: 'Scissors', message: 'Scissors' }
      ];

      store.prompt(state, [
        new SelectPrompt(
          player.id, GameMessage.CHOOSE_OPTION,
          options.map(c => c.message),
          { allowCancel: false }
        ),
        new SelectPrompt(
          opponent.id, GameMessage.CHOOSE_OPTION,
          options.map(c => c.message),
          { allowCancel: false }
        ),
      ], results => {
        const playerChosenValue = results[0];
        const opponentChosenValue = results[1];
        if (playerChosenValue === opponentChosenValue) {
          return this.reduceEffect(store, state, effect);
        }

        if ((playerChosenValue === 1 && opponentChosenValue === 0)
          || (playerChosenValue === 2 && opponentChosenValue === 1)
          || (playerChosenValue === 0 && opponentChosenValue === 2)) {
          PREVENT_DAMAGE(store, state, effect, this);
          PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
        }
      });
    }

    return state;
  }
}
