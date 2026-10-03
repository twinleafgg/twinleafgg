import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Dialga extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 130;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Reversed Clock',
    cost: [C],
    damage: 0,
    text: 'Shuffle up to 3 in any combination of Pokémon and Basic Energy cards from your discard pile into your deck.'
  },
  {
    name: 'Heavy Impact',
    cost: [M, M, C],
    damage: 110,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '103';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga 30C';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reversed Clock
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      let validCount = 0;

      player.discard.cards.forEach((c, index) => {
        const isPokemon = c instanceof PokemonCard;
        const isBasicEnergy = c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
        if (isPokemon || isBasicEnergy) {
          validCount += 1;
        } else {
          blocked.push(index);
        }
      });

      if (validCount === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        {},
        { min: 0, max: Math.min(3, validCount), allowCancel: true, blocked }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        }
      });
    }

    return state;
  }
}
