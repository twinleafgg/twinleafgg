import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChoosePokemonPrompt, PlayerType, SlotType, GameMessage, ChooseCardsPrompt, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Nuzleaf extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Seedot';
  public cardType: CardType[] = [D];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Surprise Punch',
      cost: [D, C],
      damage: 20,
      text: 'Move an Energy attached to the Defending Pokémon to 1 of your opponent\'s Benched Pokémon.'
    }
  ];

  public set: string = 'NXD';
  public setNumber: string = '71';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Nuzleaf';
  public fullName: string = 'Nuzleaf NXD';

  private usedSurprisePunch = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Surprise Punch - flag for after attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedSurprisePunch = true;
    }

    // Surprise Punch - move opponent's energy after attack
    if (AFTER_ATTACK(effect, 0, this) && this.usedSurprisePunch) {
      this.usedSurprisePunch = false;
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

    return state;
  }
}
