import { ChoosePokemonPrompt, ConfirmPrompt, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlaySupporterEffect } from '../../../game/store/effects/play-card-effects';
import {AFTER_ATTACK, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Shiftry extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Nuzleaf';
  public cardType: CardType[] = [G];
  public hp: number = 150;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Shiftry Substitution',
    text: 'As long as this Pokémon is in the Active Spot, each Supporter card in your opponent\'s hand has the effect "Draw 3 cards." (This happens instead of the card\'s usual effect.)',
    useWhenInPlay: false,
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Fan Tornado',
    cost: [G, C],
    damage: 110,
    damageCalculation: 'x',
    text: 'You may have your opponent switch their Active Pokémon with 1 of their Benched Pokémon.'
  }];

  public regulationMark: string = 'D';
  public set: string = 'VIV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Shiftry';
  public fullName: string = 'Shiftry VIV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlaySupporterEffect) {

      const cardList = StateUtils.findCardList(state, this);

      // owner of shiftry
      const player = StateUtils.findOwner(state, cardList);
      const opponent = StateUtils.getOpponent(state, player);

      // if shiftry's player played card, don't block it
      if (effect.player === player) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Check if Shiftry is active
      if (player.active === cardList) {
        // Check supporter turn counter BEFORE we process the effect
        const supporterTurn = effect.player.supporterTurn;

        if (supporterTurn > 0) {
          throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
        }

        // Prevent the original PlaySupporterEffect from executing
        effect.preventDefault = true;

        // Move the supporter card to the supporter pile
        MOVE_CARDS(store, state, effect.player.hand, effect.player.supporter, { cards: [effect.trainerCard], sourceCard: this });

        // Apply our "draw 3 cards" effect instead
        MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 3, sourceCard: this });

        // Move the supporter card to discard
        MOVE_CARDS(store, state, effect.player.supporter, effect.player.discard, { cards: [effect.trainerCard], sourceCard: this });

        // Increment supporter turn counter
        effect.player.supporterTurn += 1;

        return state;
      }

      return state;
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_SWITCH_POKEMON,
      ), wantToUse => {
        if (wantToUse) {
          return store.prompt(state, new ChoosePokemonPrompt(
            opponent.id,
            GameMessage.CHOOSE_POKEMON_TO_SWITCH,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { allowCancel: false }
          ), targets => {
            if (targets && targets.length > 0) {
              opponent.active.clearEffects();
              opponent.switchPokemon(targets[0]);
              return state;
            }
          });
        }
      });
    }

    return state;
  }
}