import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ConfirmPrompt } from '../../../game';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Octillery extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Remoraid';
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Ink Spit',
    cost: [C],
    damage: 0,
    text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  },
  {
    name: 'Special Artillery',
    cost: [W, C],
    damage: 40,
    damageCalculation: '+',
    text: 'You may discard a Special Energy from this Pokémon. If you do, this attack does 80 more damage.'
  }];

  public set: string = 'CIN';
  public setNumber: string = '23';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Octillery';
  public fullName: string = 'Octillery CIN';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ink Spit
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    // Special Artillery
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasSpecialEnergy = player.active.cards.some(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.SPECIAL
      );

      if (hasSpecialEnergy) {
        store.prompt(state, new ConfirmPrompt(
          player.id,
          GameMessage.WANT_TO_USE_ABILITY
        ), wantToUse => {
          if (wantToUse) {
            const blocked: number[] = [];
            player.active.cards.forEach((c, index) => {
              if (!(c instanceof EnergyCard) || c.energyType !== EnergyType.SPECIAL) {
                blocked.push(index);
              }
            });

            store.prompt(state, new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              player.active,
              { superType: SuperType.ENERGY },
              { min: 1, max: 1, allowCancel: false, blocked }
            ), selected => {
              if (selected && selected.length > 0) {
                MOVE_CARDS(store, state, player.active, player.discard, { cards: [selected[0]], sourceCard: this });
                effect.damage += 80;
              }
            });
          }
        });
      }
    }

    return state;
  }
}
