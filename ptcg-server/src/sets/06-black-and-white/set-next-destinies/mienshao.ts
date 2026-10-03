import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';

export class Mienshao extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Mienfoo';
  public cardType: CardType[] = [F];
  public hp: number = 90;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Haul In',
      cost: [C],
      damage: 0,
      text: 'Search your deck for 2 Pokémon Tool cards, reveal them, and put them into your hand. Shuffle your deck afterward.'
    },
    {
      name: 'Meditate',
      cost: [F, C],
      damage: 30,
      damageCalculation: '+',
      text: 'Does 10 more damage for each damage counter on the Defending Pokémon.'
    }
  ];

  public set: string = 'NXD';
  public setNumber: string = '68';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mienshao';
  public fullName: string = 'Mienshao NXD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Haul In - search for 2 Pokémon Tool cards
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Find blocked indices (non-Tool trainer cards)
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof TrainerCard) || card.trainerType !== TrainerType.TOOL) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.TRAINER },
        { min: 0, max: 2, allowCancel: true, blocked }
      ), (selected: Card[]) => {
        const cards = selected || [];

        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          ), () => { });
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    // Meditate - bonus damage for each damage counter on defender
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const damageCounters = Math.floor(opponent.active.damage / 10);
      effect.damage += damageCounters * 10;
    }

    return state;
  }
}
