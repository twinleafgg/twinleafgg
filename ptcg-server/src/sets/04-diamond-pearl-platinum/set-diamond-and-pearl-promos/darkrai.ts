import { ChooseCardsPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARD_TO } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Darkrai extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F, value: 20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Spacial Rend',
    cost: [W],
    damage: 10,
    text: 'Search your deck for a Stadium card, show it to your opponent, and put it into your hand. Shuffle your deck afterward. If there is any Stadium card in play, discard it.'
  },
  {
    name: 'Roar of Time',
    cost: [M, M, M],
    damage: 80,
    text: 'Search your discard pile for 3 Pokémon, show them to your opponent, and put them on top of your deck. Shuffle your deck afterward. (If you don\'t have 3 Pokémon in your discard pile, this attack does nothing.)'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP24';
  public name: string = 'Darkrai';
  public fullName: string = 'Darkrai DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spacial Rend
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.deck.cards.length > 0) {
        state = store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.TRAINER, trainerType: TrainerType.STADIUM },
          { min: 0, max: 1, allowCancel: true }
        ), cards => {
          if (!cards || cards.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return;
          }
          cards.forEach(card => MOVE_CARD_TO(state, card, player.hand));
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          SHUFFLE_DECK(store, state, player);
        });
      }
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        const cardList = StateUtils.findCardList(state, stadiumCard);
        const stadiumOwner = StateUtils.findOwner(state, cardList);
        MOVE_CARDS(store, state, cardList, stadiumOwner.discard, { sourceCard: this });
      }
    }

    // Roar of Time
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const pokemonInDiscard = player.discard.cards.filter(c => c instanceof PokemonCard);
      if (pokemonInDiscard.length < 3) {
        effect.damage = 0;
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        { superType: SuperType.POKEMON },
        { min: 3, max: 3, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length !== 3) {
          effect.damage = 0;
          return;
        }
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        MOVE_CARDS(store, state, player.discard, player.deck, { cards, sourceCard: this });
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
