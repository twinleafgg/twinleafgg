import { CardList, ChooseCardsPrompt, PowerType, ShowCardsPrompt, ShuffleDeckPrompt, State, StateUtils, StoreLike } from '../../../game';
import { GameLog, GameMessage } from '../../../game/game-message';
import { CardType, SpecialCondition, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class AlolanMuk extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Alolan Grimer';

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 120;

  public weakness = [{ type: CardType.FIGHTING }];

  public resistance = [{ type: CardType.PSYCHIC, value: -20 }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Adventurous Appetite',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may look at the top 6 cards of your opponent\'s deck and discard any number of Item cards you find there. Your opponent shuffles the other cards back into their deck.'
  }];

  public attacks = [
    {
      name: 'Gunk Shot',
      cost: [CardType.DARK, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: 'Your opponent\'s Active Pokémon is now Poisoned.'
    }
  ];

  public set: string = 'TEU';

  public name: string = 'Alolan Muk';

  public fullName: string = 'Alolan Muk TEU';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '84';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.getOpponent(state, player);

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 6, sourceCard: this });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        deckTop,
        { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
        { min: 0, max: 6, allowCancel: false }
      ), selected => {
        MOVE_CARDS(store, state, deckTop, opponent.discard, { cards: selected, sourceCard: this });
        MOVE_CARDS(store, state, deckTop, opponent.deck, { sourceCard: this });

        selected.forEach((card, index) => {
          store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, { name: player.name, card: card.name, effectName: this.powers[0].name });
        });

        store.prompt(state, new ShowCardsPrompt(
          opponent.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          selected
        ), () => { });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const poisonEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.POISONED]);
      store.reduceEffect(state, poisonEffect);

      return state;
    }

    return state;
  }

}
