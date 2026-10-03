import {ADD_PARALYZED_TO_PLAYER_ACTIVE, AFTER_ATTACK, COIN_FLIP_PROMPT, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import {
  CardType,
  EnergyType,
  Stage,
  SuperType
} from '../../../game/store/card/card-types';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { GameMessage } from '../../../game/game-message';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { Card, EnergyCard, State, StoreLike } from '../../../game';
export class Pachirisu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Snuggly Generator',
    cost: [L],
    damage: 0,
    text: 'For each of your Benched Pokémon that has the Nuzzle attack, search your deck for a [L] Energy card and attach it to that Pokémon. Then, shuffle your deck.'
  }, {
    name: 'Nuzzle',
    cost: [L],
    damage: 0,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }];

  public set: string = 'UPR';
  public setNumber: string = '49';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pachirisu';
  public fullName: string = 'Pachirisu UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Snuggly Generator
    // Ref: set-noble-victories/eelektrik.ts (Dynamotor - attach energy from deck)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Count benched Pokemon with Nuzzle attack
      let nuzzleCount = 0;
      const nuzzleTargets: any[] = [];
      player.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const pokemonCard = benchSlot.getPokemonCard();
          if (pokemonCard && pokemonCard.attacks.some(a => a.name === 'Nuzzle')) {
            nuzzleCount++;
            nuzzleTargets.push(benchSlot);
          }
        }
      });

      if (nuzzleCount === 0 || player.deck.cards.length === 0) {
        return state;
      }

      // For each Nuzzle Pokemon, search deck for a [L] Energy and attach it
      const lightningInDeck = player.deck.cards.filter(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.provides.includes(CardType.LIGHTNING)
      ).length;

      const maxAttach = Math.min(nuzzleCount, lightningInDeck);

      if (maxAttach === 0) {
        return SHUFFLE_DECK(store, state, player);
      }

      // Since we need to attach to specific Pokemon, use a loop
      // Search deck for up to nuzzleCount [L] Energy, then distribute
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof EnergyCard) || card.energyType !== EnergyType.BASIC || !card.provides.includes(CardType.LIGHTNING)) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.ENERGY },
        { min: 0, max: maxAttach, allowCancel: false, blocked }
      ), (selected: Card[]) => {
        const cards = selected || [];
        // Attach one energy to each Nuzzle Pokemon
        for (let i = 0; i < cards.length && i < nuzzleTargets.length; i++) {
          MOVE_CARDS(store, state, player.deck, nuzzleTargets[i], { cards: [cards[i]], sourceCard: this });
        }
        return SHUFFLE_DECK(store, state, player);
      });
    }

    // Attack 2: Nuzzle
    // Ref: AGENTS-patterns.md (coin flip + paralyzed)
    if (AFTER_ATTACK(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
        }
      });
    }

    return state;
  }
}
