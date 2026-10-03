import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, StateUtils, Card, ChooseCardsPrompt, ChoosePokemonPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Honchkrow extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Murkrow';

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 110;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [{ type: CardType.FIGHTING, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Rip and Run',
      cost: [CardType.DARK],
      damage: 0,
      text: 'Discard a random card from your opponent\'s hand. Switch this Pokémon with 1 of your Benched Pokémon.'
    },
    {
      name: 'Speed Dive',
      cost: [CardType.DARK, CardType.COLORLESS, CardType.COLORLESS],
      damage: 90,
      text: ''
    }
  ];

  public set: string = 'UPR';

  public setNumber = '72';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Honchkrow';

  public fullName: string = 'Honchkrow UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rip and Run
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // we rippin
      if (opponent.hand.cards.length === 0) {
        let cards: Card[] = [];
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          {},
          { min: 1, max: 1, allowCancel: false, isSecret: true }
        ), selected => {
          cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
        });
      }

      // and we runnin
      const hasBenched = player.bench.some(b => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false }
      ), result => {
        const cardList = result[0];
        player.switchPokemon(cardList);
      });
    }

    return state;
  }
}