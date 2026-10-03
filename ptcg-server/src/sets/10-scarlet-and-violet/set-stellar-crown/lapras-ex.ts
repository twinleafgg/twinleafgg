import {
  AttachEnergyPrompt,
  Card,
  CardList,
  CardTag,
  CardType,
  EnergyCard,
  GameMessage,
  PlayerType,
  PokemonCard,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Laprasex extends PokemonCard {
  public cardType: CardType[] = [CardType.WATER];

  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];

  public hp = 220;

  public stage = Stage.BASIC;

  public weakness = [{ type: CardType.METAL }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Power Splash',
      cost: [CardType.WATER],
      damage: 40,
      damageCalculation: 'x',
      text: 'This attack does 40 damage for each Energy attached to this Pokémon.',
    },
    {
      name: 'Larimar Rain',
      cost: [CardType.WATER, CardType.PSYCHIC, CardType.METAL],
      damage: 0,
      text: 'Look at the top 20 cards of your deck and attach any number of Energy cards you find there to your Pokémon in any way you like. Shuffle the other cards back into your deck.',
    },
  ];

  public regulationMark = 'H';

  public set: string = 'SCR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '32';

  public name: string = 'Lapras ex';

  public fullName: string = 'Lapras ex SCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.getPokemonCard() === this) {
          const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
          store.reduceEffect(state, checkProvidedEnergy);

          const blockedCards: Card[] = [];

          checkProvidedEnergy.energyMap.forEach((em) => {
            if (!em.provides.includes(CardType.ANY)) {
              blockedCards.push(em.card);
            }
          });

          const damagePerEnergy = 40;

          effect.damage = checkProvidedEnergy.energyMap.length * damagePerEnergy;
        }
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const temp = new CardList();
      // Create deckBottom and move hand into it
      const deckBottom = new CardList();

      MOVE_CARDS(store, state, player.deck, temp, { count: 20, sourceCard: this });
      // Check if any cards drawn are basic energy
      const energyCardsDrawn = temp.cards.filter((card) => {
        return card instanceof EnergyCard;
      });

      // If no energy cards were drawn, move all cards to deck & shuffle
      if (energyCardsDrawn.length == 0) {
        store.prompt(
          state,
          [new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, temp.cards)],
          () => {
            temp.cards.forEach((card) => {
              store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                temp.applyOrder(order);
                MOVE_CARDS(store, state, temp, deckBottom, { cards: [card], sourceCard: this });
                deckBottom.applyOrder(order);
                MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });
              });
              return state;
            });
            return state;
          },
        );
      }

      if (energyCardsDrawn.length >= 1) {
        // Prompt to attach energy if any were drawn
        return store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_CARDS,
            temp, // Only show drawn energies
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH, SlotType.ACTIVE],
            { superType: SuperType.ENERGY },
            { min: 0, max: energyCardsDrawn.length },
          ),
          (transfers) => {
            // Attach energy based on prompt selection
            if (transfers) {
              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, temp, target, { cards: [transfer.card], sourceCard: this }); // Move card to target
              }
              temp.cards.forEach((card) => {
                store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  temp.applyOrder(order);
                  MOVE_CARDS(store, state, temp, deckBottom, { cards: [card], sourceCard: this });
                  deckBottom.applyOrder(order);
                  MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });
                });
                return state;
              });
            }
          },
        );
      }
      // Shuffle the deck
      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
        return state;
      });
    }

    if (
      effect instanceof PutDamageEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      effect.preventDefault = true;
    }
    return state;
  }
}
