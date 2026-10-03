import { PlayerType, StoreLike, State, StateUtils, GameError, GameMessage } from '../../../game';
import { CardTag, CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ScrambleEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];
  public energyType = EnergyType.SPECIAL;

  public set: string = 'DX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name = 'Scramble Energy';
  public fullName = 'Scramble Energy DX';

  public text: string =
    "Scramble Energy can be attached only to an Evolved Pokémon (excluding Pokémon-ex). Scramble Energy provides [C] Energy. While in play, if you have more Prize cards left than your opponent, Scramble Energy provides every type of Energy but provides only 3 in any combination at a time. If the Pokémon Scramble Energy is attached to isn't an Evolved Pokémon (or evolves into Pokémon-ex), discard Scramble Energy.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      if (
        !effect.target.isEvolved() ||
        effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_ex)
      ) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }
    }

    // Provide energy
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const provides =
        player.getPrizeLeft() > opponent.getPrizeLeft()
          ? [CardType.ANY, CardType.ANY, CardType.ANY]
          : [CardType.COLORLESS];

      effect.energyMap.push({ card: this, provides });
      return state;
    }

    // Discard card when not attached to Evolved Pokemon or pokemon-ex
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (!cardList.cards.includes(this)) {
            return;
          }

          const attachedTo = cardList.getPokemonCard();

          if (
            !!attachedTo &&
            (attachedTo.hasTag(CardTag.POKEMON_ex) || cardList.getPokemons().length < 2)
          ) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });

      return state;
    }
    return state;
  }
}
