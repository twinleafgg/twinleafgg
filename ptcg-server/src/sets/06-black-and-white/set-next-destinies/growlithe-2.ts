import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AttackEffect } from '../../../game/store/effects/game-effects';

export class Growlithe2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 80;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Stoke',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, search your deck for a [R] Energy card and attach it to this Pokémon. Shuffle your deck afterward.'
  }, {
    name: 'Firebreathing',
    cost: [R, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 more damage.'
  }];

  public set: string = 'NXD';
  public setNumber: string = '10';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Growlithe';
  public fullName: string = 'Growlithe NXD 10';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stoke
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          if (player.deck.cards.length === 0) {
            return;
          }

          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_ATTACH,
            player.deck,
            {
              superType: SuperType.ENERGY,
              energyType: EnergyType.BASIC,
              provides: [CardType.FIRE]
            },
            { min: 0, max: 1, allowCancel: false }
          ), selected => {
            selected.forEach(card => {
              MOVE_CARDS(store, state, player.deck, player.active, { cards: [card], sourceCard: this });
            });

            store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
              player.deck.applyOrder(order);
            });
          });
        }
      });
    }

    // Firebreathing
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          (effect as AttackEffect).damage += 20;
        }
      });
    }

    return state;
  }
}
