import { GameMessage, PlayerType, SlotType, StateUtils } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { ChoosePokemonPrompt } from '../../game/store/prompts/choose-pokemon-prompt';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Defender extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS';

  public name: string = 'Defender';

  public fullName: string = 'Defender BS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '80';

  public putIntoPlay = true;

  public text: string =
    "Attach Defender to 1 of your Pokémon. At the end of your opponent's next turn, discard Defender. Damage done to that Pokémon by attacks is reduced by 20 (after applying Weakness and Resistance).";

  public readonly DEFENDER_MARKER = 'DEFENDER_MARKER';
  public readonly CLEAR_DEFENDER_MARKER = 'CLEAR_DEFENDER_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, min: 1, max: 1 },
        ),
        (results) => {
          if (results && results.length > 0) {
            const targetPokemon = results[0];
            targetPokemon.marker.addMarker(this.DEFENDER_MARKER, this);
            const opponent = StateUtils.getOpponent(state, player);
            opponent.marker.addMarker(this.CLEAR_DEFENDER_MARKER, this);
          }
        },
      );
    }

    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      effect.damage -= 20;
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.CLEAR_DEFENDER_MARKER)
    ) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.marker.hasMarker(this.DEFENDER_MARKER, this)) {
          cardList.marker.removeMarker(this.DEFENDER_MARKER, this);
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    return state;
  }
}
