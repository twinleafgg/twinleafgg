import { GameMessage, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK, COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class CrawdauntG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [D];
  public hp: number = 80;
  public weakness = [{ type: L, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Smash Turn',
    cost: [C],
    damage: 10,
    text: 'You may switch Crawdaunt G with 1 of your Benched Pokémon.'
  }, {
    name: 'Hyper Beam',
    cost: [D, C, C],
    damage: 40,
    text: 'Flip a coin. If heads, discard an Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';
  public name: string = 'Crawdaunt G';
  public fullName: string = 'Crawdaunt G SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Smash Turn
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      if (player.bench.some(b => b.cards.length > 0)) {
        CONFIRMATION_PROMPT(store, state, player, wantToSwitch => {
          if (wantToSwitch) {
            SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
          }
        }, GameMessage.WANT_TO_SWITCH_POKEMON);
      }
    }

    // Hyper Beam
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }

    return state;
  }
}
