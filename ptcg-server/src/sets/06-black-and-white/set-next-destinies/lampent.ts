import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lampent extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Litwick';
  public cardType: CardType[] = [R];
  public hp: number = 80;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Ember',
    cost: [R, C],
    damage: 40,
    text: 'Flip a coin. If tails, discard an Energy attached to this Pokémon.'
  }];

  public set: string = 'NXD';
  public setNumber: string = '19';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lampent';
  public fullName: string = 'Lampent NXD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          const energyCards = player.active.cards.filter(c => c.superType === SuperType.ENERGY);
          if (energyCards.length > 0) {
            store.prompt(state, new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              player.active,
              { superType: SuperType.ENERGY },
              { min: 1, max: 1, allowCancel: false }
            ), selected => {
              selected.forEach(card => {
                MOVE_CARDS(store, state, player.active, player.discard, { cards: [card], sourceCard: this });
              });
            });
          }
        }
      });
    }
    return state;
  }
}
