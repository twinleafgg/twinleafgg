import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { EnergyCard, GameMessage, PlayerType, StoreLike, State } from '../../../game';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { SlotType } from '../../../game/store/actions/play-card-action';

export class Beautifly extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Silcoon';
  public cardType: CardType[] = [G];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Triple Energy',
      cost: [G],
      damage: 0,
      text: 'Search your deck for 3 different types of basic Energy cards and attach them to your Pokémon in any way you like. Shuffle your deck afterward.'
    },
    {
      name: 'Drainpour',
      cost: [G, C, C],
      damage: 40,
      text: 'Heal 40 damage from each of your Benched Pokémon.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '8';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Beautifly';
  public fullName: string = 'Beautifly DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Triple Energy - search deck for 3 different types of basic Energy, attach to your Pokemon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      // Find available basic energy types in deck
      const basicEnergyInDeck = player.deck.cards.filter(c =>
        c.superType === SuperType.ENERGY && (c as EnergyCard).energyType === EnergyType.BASIC
      );

      if (basicEnergyInDeck.length === 0) {
        return SHUFFLE_DECK(store, state, player);
      }

      // Get unique types available
      const typesAvailable = new Set<CardType>();
      basicEnergyInDeck.forEach(c => {
        if (c.superType === SuperType.ENERGY) {
          (c as EnergyCard).provides.forEach(t => typesAvailable.add(t));
        }
      });

      const maxCards = Math.min(3, typesAvailable.size);

      // Let player choose up to 3 basic energy cards of different types
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card.superType !== SuperType.ENERGY || (card as EnergyCard).energyType !== EnergyType.BASIC) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.deck,
        { superType: SuperType.ENERGY },
        { min: 0, max: maxCards, allowCancel: true, blocked }
      ), selectedCards => {
        const cards = selectedCards || [];

        if (cards.length === 0) {
          return SHUFFLE_DECK(store, state, player);
        }

        // Now attach each energy to a Pokemon of player's choice
        const attachNext = (index: number): State => {
          if (index >= cards.length) {
            return SHUFFLE_DECK(store, state, player);
          }

          const card = cards[index];

          return store.prompt(state, new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { min: 1, max: 1, allowCancel: false }
          ), targets => {
            if (targets && targets.length > 0) {
              MOVE_CARDS(store, state, player.deck, targets[0], { cards: [card], sourceCard: this });
            }
            return attachNext(index + 1);
          });
        };

        return attachNext(0);
      });
    }

    // Drainpour - heal 40 from each Benched Pokemon
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList === player.active) {
          return;
        }
        if (cardList.damage > 0) {
          const healEffect = new HealEffect(player, cardList, 40);
          store.reduceEffect(state, healEffect);
        }
      });
    }

    return state;
  }
}
