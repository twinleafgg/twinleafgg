import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game';
import { CONFIRMATION_PROMPT, WAS_ATTACK_USED, MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';

export class Clefairy extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 50;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Doll Swap',
    cost: [C, C, C],
    damage: 60,
    text: 'Put this Pokémon and all cards attached to it into your hand. If you do, you may play Lillie\'s Poké Doll from your hand as your new Active Pokémon.'
  }];

  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '144';
  public name: string = 'Clefairy';
  public fullName: string = 'Clefairy CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      MOVE_POKEMON_OFF_BOARD(store, state, player.active, {
        pokemonDestination: player.hand,
        sourceCard: this,
      });

      const lilliesPokeDoll = player.hand.cards.find(card => card instanceof TrainerCard && card.name === 'Lillie\'s Poké Doll');

      // Check if Lillie's Poké Doll is in the player's hand
      if (lilliesPokeDoll && !player.active.getPokemonCard()) {
        CONFIRMATION_PROMPT(store, state, player, result => {
          if (result) {
            const playPokemonEffect = new PlayPokemonEffect(player, lilliesPokeDoll as PokemonCard, player.active);
            store.reduceEffect(state, playPokemonEffect);
          }
        });
      }
    }
    return state;
  }
}