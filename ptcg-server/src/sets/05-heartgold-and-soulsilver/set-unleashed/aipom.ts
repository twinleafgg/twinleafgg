import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChoosePokemonPrompt, PlayerType, SlotType, GameMessage, ChooseCardsPrompt, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, COIN_FLIP_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Aipom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 50;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Tail Code',
    cost: [C],
    damage: 0,
    text: 'Move an Energy card attached to the Defending Pokémon to another of your opponent\'s Pokémon.'
  }, {
    name: 'Tail Smash',
    cost: [C, C],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }];

  public set: string = 'UL';
  public setNumber: string = '43';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Aipom';
  public fullName: string = 'Aipom UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Surprise Punch - move opponent's energy after attack
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some(b => b.cards.length > 0);
      const hasEnergy = opponent.active.cards.some(c => c.superType === SuperType.ENERGY);
      if (!hasBenched || !hasEnergy) {
        return state;
      }

      // Get blocked indices for non-energy cards
      const blocked: number[] = [];
      opponent.active.cards.forEach((card, index) => {
        if (card.superType !== SuperType.ENERGY) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        opponent.active,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length === 0) {
          return;
        }

        return store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (targets && targets.length > 0) {
            MOVE_CARDS(store, state, opponent.active, targets[0], { cards: [cards[0]], sourceCard: this });
          }
        });
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
