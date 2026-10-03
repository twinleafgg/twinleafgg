import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, SHUFFLE_DECK, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class Leavanny extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Swadloon';
  public cardType: CardType[] = [G];
  public hp: number = 130;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Nurturing',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your Pokémon. Search your deck for a card that evolves from that Pokémon and put it onto that Pokémon. (This counts as evolving that Pokémon.) Shuffle your deck afterward.'
  }, {
    name: 'X-Scissor',
    cost: [G, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 50 more damage.'
  }];

  public set: string = 'EPO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Leavanny';
  public fullName: string = 'Leavanny EPO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { allowCancel: false }
      ), targets => {
        if (targets && targets.length > 0) {
          const targetSlot = targets[0];
          const targetCard = targetSlot.getPokemonCard();

          if (targetCard) {
            const evolvesFromName = targetCard.name;

            // Build blocked list - block cards that don't evolve from the target
            const blocked: number[] = [];
            player.deck.cards.forEach((card, index) => {
              if (!(card instanceof PokemonCard) || card.evolvesFrom !== evolvesFromName) {
                blocked.push(index);
              }
            });

            // Search for evolution card
            return store.prompt(state, new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_EVOLVE,
              player.deck,
              { superType: SuperType.POKEMON },
              { min: 0, max: 1, allowCancel: true, blocked }
            ), cards => {
              if (cards && cards.length > 0) {
                const evolutionCard = cards[0] as PokemonCard;
                MOVE_CARDS(store, state, player.deck, targetSlot, { cards: [evolutionCard], sourceCard: this });
                targetSlot.pokemonPlayedTurn = state.turn;
              }
              SHUFFLE_DECK(store, state, player);
            });
          } else {
            SHUFFLE_DECK(store, state, player);
          }
        } else {
          SHUFFLE_DECK(store, state, player);
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          (effect as AttackEffect).damage += 50;
        }
      });
    }

    return state;
  }
}
