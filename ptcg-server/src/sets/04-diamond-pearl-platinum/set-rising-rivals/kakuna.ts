import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, GameMessage, ChooseCardsPrompt, Card, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {ADD_POISON_TO_PLAYER_ACTIVE, AFTER_ATTACK, COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Kakuna extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Weedle';
  public cardType: CardType[] = [G];
  public hp: number = 80;
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Exoskeleton',
    powerType: PowerType.POKEBODY,
    text: 'Any damage done to Kakuna by attacks is reduced by 20 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Dangerous Evolution',
    cost: [G],
    damage: 0,
    text: 'The Defending Pokémon is now Poisoned. Flip a coin. If heads, search your deck for an Evolution card that evolves from Kakuna and put it onto Kakuna. (This counts as evolving Kakuna.) Shuffle your deck afterward.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Kakuna';
  public fullName: string = 'Kakuna RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PutDamageEffect && effect.target.getPokemonCard() === this) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        effect.damage -= 20;
      }
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      ADD_POISON_TO_PLAYER_ACTIVE(store, state, opponent, this);

      if (player.deck.cards.length === 0) {
        return state;
      }

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          let cards: Card[] = [];
          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_EVOLVE,
            player.deck,
            { superType: SuperType.POKEMON, evolvesFrom: this.name },
            { min: 0, max: 1, allowCancel: false }
          ), selected => {
            cards = selected || [];

            if (cards.length > 0) {
              // Evolve Pokemon
              MOVE_CARDS(store, state, player.deck, player.active, { cards: cards, sourceCard: this });
              player.active.clearEffects();
              player.active.pokemonPlayedTurn = state.turn;
            }

            SHUFFLE_DECK(store, state, player);
          });
        }
      });
    }

    return state;
  }
}