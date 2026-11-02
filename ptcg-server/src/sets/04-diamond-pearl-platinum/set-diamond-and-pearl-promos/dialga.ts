import { EnergyCard } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT } from '../../../game/store/prefabs/prefabs';
import { DEVOLVE_POKEMON } from '../../../game/store/prefabs/prefabs';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dialga extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: 20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Time Bellow',
    cost: [M],
    damage: 10,
    text: 'Draw a card.'
  },
  {
    name: 'Flash Cannon',
    cost: [M, M, C],
    damage: 40,
    text: 'You may return all Energy cards attached to Dialga to your hand. If you do, remove the highest Stage Evolution card from the Defending Pokémon and shuffle that card into your opponent\'s deck.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP26';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Time Bellow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 1);
    }

    // Flash Cannon
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const energies = player.active.cards.filter(c => c instanceof EnergyCard);
      if (energies.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }
        MOVE_CARDS(store, state, player.active, player.hand, {
          cards: energies,
          sourceCard: this,
        });
        if (opponent.active.getPokemons().length > 1) {
          DEVOLVE_POKEMON(store, state, opponent.active, opponent.deck);
          SHUFFLE_DECK(store, state, opponent);
        }
      }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
    }

    return state;
  }
}
