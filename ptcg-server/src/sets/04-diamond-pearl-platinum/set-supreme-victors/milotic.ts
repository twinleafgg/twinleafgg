import { CardTarget, ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { CONFIRMATION_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Milotic extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Feebas';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Cleansing Ring',
    cost: [W, C],
    damage: 20,
    text: 'You may discard 2 cards from your hand. If you do, remove 4 damage counters from 1 of your Pokémon.'
  }, {
    name: 'Scale Blow',
    cost: [W, C, C],
    damage: 90,
    damageCalculation: '-',
    text: 'Does 90 damage minus 10 damage for each card in your hand.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = 'Milotic';
  public fullName: string = 'Milotic SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cleansing Ring
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.hand.cards.length < 2) {
        return state;
      }
      let hasPokemonWithDamage = false;
      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        if (cardList.damage === 0) {
          blocked.push(target);
        } else {
          hasPokemonWithDamage = true;
        }
      });
      if (!hasPokemonWithDamage) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToDiscard => {
        if (!wantToDiscard) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { min: 2, max: 2, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length !== 2) {
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
          store.prompt(state, new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_HEAL,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { min: 1, max: 1, allowCancel: false, blocked }
          ), results => {
            const targets = results || [];
            targets.forEach(target => {
              store.reduceEffect(state, new HealEffect(player, target, 40));
            });
          });
        });
      }, GameMessage.WANT_TO_DISCARD_CARDS);
    }

    // Scale Blow
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = Math.max(0, 90 - effect.player.hand.cards.length * 10);
    }

    return state;
  }
}
