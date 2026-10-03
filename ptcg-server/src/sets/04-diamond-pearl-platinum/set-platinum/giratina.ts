import { ConfirmPrompt, GameMessage, PlayerType, PowerType, ShuffleDeckPrompt, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {MULTIPLE_COIN_FLIPS_PROMPT, IS_POKEPOWER_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Giratina extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 100;
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Let Loose',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Giratina from your hand onto your Bench, you may use this power. Each player shuffles his or her hand into his or her deck and draws up to 4 cards. (You draw your cards first.)'
  }];

  public attacks = [{
    name: 'Earth Power',
    cost: [P, P, C],
    damage: 60,
    text: 'Flip 2 coins. This attack does 10 damage times the number of heads to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Giratina';
  public fullName: string = 'Giratina PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const powerEffect = new PowerEffect(player, this.powers[0], this);
          store.reduceEffect(state, powerEffect);

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
      const player = effect.player;
      const opponent = effect.opponent;

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        const heads = results.filter(r => r).length;
        if (heads > 0) {
          opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, card => {
            if (card !== opponent.active) {
              const damage = new PutDamageEffect(effect, (10 * heads));
              damage.target = card;
              store.reduceEffect(state, damage);
            }
          });
        }
      });
    }

    return state;
  }
}