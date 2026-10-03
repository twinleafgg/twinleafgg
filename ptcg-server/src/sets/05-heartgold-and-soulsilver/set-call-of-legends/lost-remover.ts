import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import {
  PlayerType,
  SlotType,
  StateUtils,
  CardTarget,
  GameError,
  GameMessage,
  PokemonCardList,
  ChooseCardsPrompt,
} from '../../../game';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LostRemover extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'CL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Lost Remover';
  public fullName: string = 'Lost Remover CL';

  public text: string =
    "Put 1 Special Energy card attached to 1 of your opponent's Pokémon in the Lost Zone.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let hasPokemonWithEnergy = false;
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.energies.cards.some((c) => c.energyType === EnergyType.SPECIAL)) {
          hasPokemonWithEnergy = true;
        } else {
          blocked.push(target);
        }
      });

      if (!hasPokemonWithEnergy) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      let targets: PokemonCardList[] = [];
      store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (results) => {
          targets = results || [];

          if (targets.length === 0) {
            return state;
          }

          const target = targets[0];
          store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              target.energies,
              { energyType: EnergyType.SPECIAL },
              { min: 1, max: 1, allowCancel: false },
            ),
            (selected) => {
              MOVE_CARDS(store, state, target, opponent.lostzone, {
                cards: selected,
                sourceCard: this,
              });
            },
          );
        },
      );
    }
    return state;
  }
}
