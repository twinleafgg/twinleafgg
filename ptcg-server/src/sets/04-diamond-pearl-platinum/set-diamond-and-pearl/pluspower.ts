import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PlusPower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'DP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '109';
  public name: string = 'PlusPower';
  public fullName: string = 'PlusPower DP';

  public text: string =
    'Attach PlusPower to 1 of your Pokémon. Discard this card at the end of your turn.\n\nIf the Pokémon PlusPower is attached to attacks, the attack does 10 more damage to the Active Pokémon (before applying Weakness and Resistance).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 1, allowCancel: false },
        ),
        (transfers) => {
          MOVE_CARDS(store, state, player.supporter, transfers[0], {
            cards: [effect.trainerCard],
            sourceCard: this,
          });
        },
      );
    }

    // Discard at end of your's turn
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    // Actual effect
    if (effect instanceof DealDamageEffect && effect.source.cards.includes(this)) {
      // must deal > 0 damage to active Pokémon
      if (
        effect.damage &&
        effect.damage > 0 &&
        (effect.target === effect.opponent.active || effect.target === effect.player.active)
      ) {
        effect.damage += 10;
      }
    }

    return state;
  }
}
