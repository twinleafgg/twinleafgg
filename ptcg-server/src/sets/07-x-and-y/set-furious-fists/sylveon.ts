import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card, PlayerType, SlotType, EnergyCard, ChooseCardsPrompt, ChoosePokemonPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { NEXT_TURN_ATTACK_BONUS } from '../../../game/store/prefabs/attack-effects';

export class Sylveon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public cardType: CardType[] = [Y];
  public hp: number = 90;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Curly Ribbon',
    cost: [Y],
    damage: 30,
    text: 'Move an Energy attached to your opponent\'s Active Pokémon to 1 of his or her Benched Pokémon.'
  },
  {
    name: 'Echoed Voice',
    cost: [Y, C, C],
    damage: 50,
    text: 'During your next turn, this Pokémon\'s Echoed Voice attack does 50 more damage (before applying Weakness and Resistance).'
  }];

  public set: string = 'FFI';
  public setNumber: string = '72';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sylveon';
  public fullName: string = 'Sylveon FFI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Curly Ribbon
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some(b => b.cards.length > 0);
      const hasEnergy = opponent.active.cards.some(c => c instanceof EnergyCard);
      if (!hasBenched || !hasEnergy) {
        return state;
      }

      const blocked: number[] = [];
      opponent.active.cards.forEach((card, index) => {
        if (!(card instanceof EnergyCard)) {
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

    // Echoed Voice
    NEXT_TURN_ATTACK_BONUS(effect, {
      attack: this.attacks[1],
      source: this,
      bonusDamage: 50,
    });

    return state;
  }
}
