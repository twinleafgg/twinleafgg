import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, TrainerCard, Card, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Azumarill extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [CardType.WATER];
  public hp: number = 120;
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];
  public weakness = [{ type: CardType.LIGHTNING }];
  public evolvesFrom = 'Marill';

  public attacks = [{
    name: 'Dive and Rescue',
    cost: [CardType.WATER],
    damage: 0,
    text: 'Put up to 3 in any combination of Pokémon and Supporter cards from your discard pile into your hand. '
  },
  {
    name: 'Surf',
    cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
    damage: 90,
    text: ''
  }];

  public set: string = 'FST';
  public setNumber: string = '59';
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Azumarill';
  public fullName: string = 'Azumarill FST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasSupporterOrPokemonInDiscard = player.discard.cards.some(c => {
        return (c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER) || c instanceof PokemonCard;
      });

      if (!hasSupporterOrPokemonInDiscard) {
        return state;
      }

      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        const isPokemon = c instanceof PokemonCard;
        const isSupporter = c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
        if (!isPokemon && !isSupporter) {
          blocked.push(index);
        }
      });

      if (hasSupporterOrPokemonInDiscard) {
        let cards: Card[] = [];

        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          {},
          { min: 1, max: 3, allowCancel: false, blocked }
        ), selected => {
          cards = selected || [];

          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });

        });
      }
    }

    return state;
  }

}