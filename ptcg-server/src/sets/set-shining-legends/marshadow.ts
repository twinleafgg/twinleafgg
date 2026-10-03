import { ConfirmPrompt, GameMessage, PowerType, ShuffleDeckPrompt, State, StateUtils, StoreLike } from '../../game';
import { CardType, Stage } from '../../game/store/card/card-types';
import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Effect } from '../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Marshadow extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 70;

  public weakness = [{ type: CardType.DARK }];

  public resistance = [{ type: CardType.FIGHTING, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Let Loose',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may have each player shuffle their hand into their deck and draw 4 cards.'
  }];

  public attacks = [{
    name: 'Shadow Punch',
    cost: [CardType.PSYCHIC, CardType.COLORLESS],
    damage: 30,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  }];

  public set: string = 'SLG';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '45';

  public name: string = 'Marshadow';

  public fullName: string = 'Marshadow SLG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const cards = player.hand.cards.filter(c => c !== this);

          MOVE_CARDS(store, state, player.hand, player.deck, { cards: cards, sourceCard: this });
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { sourceCard: this });

          store.prompt(state, [
            new ShuffleDeckPrompt(player.id),
            new ShuffleDeckPrompt(opponent.id)
          ], deckOrder => {
            player.deck.applyOrder(deckOrder[0]);
            opponent.deck.applyOrder(deckOrder[1]);

            MOVE_CARDS(store, state, player.deck, player.hand, { count: 4, sourceCard: this });
            MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 4, sourceCard: this });
          });
        }

        return state;
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}