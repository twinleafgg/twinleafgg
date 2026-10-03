import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, EnergyType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { EnergyCard, Player, PokemonCardList, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, TRAINER_TARGET_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class MegatonBlower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.ACE_SPEC];
  public set: string = 'SSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '182';
  public regulationMark = 'H';
  public name: string = 'Megaton Blower';
  public fullName: string = 'Megaton Blower SSP';
  public text: string =
    "Discard all Pokémon Tools and Special Energy from all of your opponent's Pokémon, and discard a Stadium in play.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      effect.preventDefault = true;

      // Handle stadium discard if one is in play
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard) {
        const cardList = StateUtils.findCardList(state, stadiumCard);
        if (cardList) {
          const stadiumOwner = StateUtils.findOwner(state, cardList);
          state = MOVE_CARDS(store, state, cardList, stadiumOwner.discard, {
            cards: [stadiumCard],
            sourceCard: this,
          });
        }
      }

      const opponent = StateUtils.getOpponent(state, player);

      // Function to discard special energy and tools from a PokemonCardList
      const discardSpecialEnergyAndTools = (pokemonCardList: PokemonCardList) => {
        if (TRAINER_TARGET_BLOCKED(store, state, player, this, pokemonCardList)) {
          return;
        }
        const cardsToDiscard = pokemonCardList.cards.filter(
          (card) =>
            (card.superType === SuperType.ENERGY &&
              (card as EnergyCard).energyType === EnergyType.SPECIAL) ||
            (card instanceof TrainerCard && card.trainerType === TrainerType.TOOL),
        );
        if (cardsToDiscard.length > 0) {
          state = MOVE_CARDS(store, state, pokemonCardList, opponent.discard, {
            cards: cardsToDiscard,
          });
        }
      };

      // Discard from active Pokémon
      discardSpecialEnergyAndTools(opponent.active);

      // Discard from bench Pokémon
      opponent.bench.forEach((benchPokemon) => {
        if (benchPokemon.cards.length > 0) {
          discardSpecialEnergyAndTools(benchPokemon);
        }
      });

      // Move this card to discard pile
      state = MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this] });
    }

    return state;
  }
}
