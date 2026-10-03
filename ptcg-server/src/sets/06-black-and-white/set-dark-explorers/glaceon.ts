import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt, ChoosePokemonPrompt, PlayerType, SlotType, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';

export class Glaceon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Eevee';
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Quick Attack',
      cost: [C],
      damage: 10,
      damageCalculation: '+',
      text: 'Flip a coin. If heads, this attack does 30 more damage.'
    },
    {
      name: 'Reflect Energy',
      cost: [W, C],
      damage: 40,
      text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.'
    }
  ];

  public set: string = 'DEX';
  public setNumber: string = '30';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Glaceon';
  public fullName: string = 'Glaceon DEX';

  private usedReflectEnergy = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quick Attack - flip for +30
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }

    // Reflect Energy - flag for after attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      this.usedReflectEnergy = true;
    }

    // Reflect Energy - move energy after attack
    if (AFTER_ATTACK(effect, 1, this) && this.usedReflectEnergy) {
      this.usedReflectEnergy = false;
      const player = effect.player;

      const hasBenched = player.bench.some(b => b.cards.length > 0);
      const hasEnergy = player.active.cards.some(c => c.superType === SuperType.ENERGY);
      if (!hasBenched || !hasEnergy) {
        return state;
      }

      // Get blocked indices for non-energy cards
      const blocked: number[] = [];
      player.active.cards.forEach((card, index) => {
        if (card.superType !== SuperType.ENERGY) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.active,
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
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (targets && targets.length > 0) {
            MOVE_CARDS(store, state, player.active, targets[0], { cards: [cards[0]], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
