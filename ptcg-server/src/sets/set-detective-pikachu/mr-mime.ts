import { Attack, CardList, ChoosePrizePrompt, ConfirmPrompt, Power, PowerType, State, StoreLike } from '../../game';
import { GameMessage } from '../../game/game-message';
import { CardType, Stage } from '../../game/store/card/card-types';
import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Effect } from '../../game/store/effects/effect';

import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import {ABILITY_USED, BLOCK_IF_DECK_EMPTY, IS_ABILITY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class MrMime extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers: Power[] = [{
    name: 'Pantomime',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may switch 1 of your face-down Prize cards with the top card of your deck.'
  }];

  public attacks: Attack[] = [
    {
      name: 'Juggling',
      cost: [P, C],
      damage: 20,
      damageCalculation: 'x',
      text: 'Flip 4 coins. This attack does 20 damage for each heads.'
    }
  ];

  public set: string = 'DET';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Mr. Mime';
  public fullName: string = 'Mr. Mime DET';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Pantomime
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, effect.player, effect.pokemonCard)) {
        return state;
      }

      BLOCK_IF_DECK_EMPTY(effect.player);

      return store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          ABILITY_USED(player, this);

          // Select prize to swap
          return store.prompt(state, new ChoosePrizePrompt(
            player.id,
            GameMessage.CHOOSE_PRIZE_CARD,
            { count: 1, allowCancel: false, isSecret: true }
          ), selected => {
            const selectedPrizes = selected || [];
            if (selectedPrizes.length > 0) {
              const selectedPrize = selectedPrizes[0];
              const prizeIndex = player.prizes.indexOf(selectedPrize);

              // Move prize card to temp list
              const tempList = new CardList();
              MOVE_CARDS(store, state, selectedPrize, tempList, { sourceCard: this });

              // Move card from deck to prizes face down at the original index
              MOVE_CARDS(store, state, player.deck, player.prizes[prizeIndex], { count: 1, sourceCard: this });
              player.prizes[prizeIndex].isSecret = true;

              // Move prize card to top of deck
              tempList.moveToTopOfDestination(player.deck);
            }
          });
        }
      });
    }

    // Juggling
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 4, results => {
        let heads: number = 0;
        results.forEach(r => {
          if (r) heads++;
        });
        effect.damage = 20 * heads;
      });
    }
    return state;
  }
}