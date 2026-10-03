import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChoosePokemonPrompt, PlayerType, SlotType, GameMessage, ChooseCardsPrompt, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Hippowdon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Hippopotas';
  public cardType: CardType[] = [F];
  public hp: number = 130;
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Sand Bazooka',
      cost: [F, C, C],
      damage: 70,
      text: 'You may move 1 Energy attached to this Pokémon to 1 of your Benched Pokémon.'
    },
    {
      name: 'Rock Tumble',
      cost: [F, F, C, C],
      damage: 90,
      text: 'This attack\'s damage isn\'t affected by Resistance.'
    }
  ];

  public set: string = 'NXD';
  public setNumber: string = '66';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Hippowdon';
  public fullName: string = 'Hippowdon NXD';

  private usedSandBazooka = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sand Bazooka - flag for after attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedSandBazooka = true;
    }

    // Sand Bazooka - move energy after attack
    if (AFTER_ATTACK(effect, 0, this) && this.usedSandBazooka) {
      this.usedSandBazooka = false;
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
        { min: 0, max: 1, allowCancel: true, blocked }
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

    // Rock Tumble - ignores resistance
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}
