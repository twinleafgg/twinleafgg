import { PokemonCard, Stage, CardType, State, StoreLike, ChooseCardsPrompt, EnergyCard, EnergyType, GameMessage, StateUtils, SuperType, TrainerCard, TrainerType } from '../../../game';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cobalion extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Holy Edge',
      cost: [M],
      damage: 20,
      text: 'Discard 1 Special Energy from your opponent\'s Active Pokémon.'
    },
    {
      name: 'Metal Arms',
      cost: [M, M, C],
      damage: 80,
      damageCalculation: '+',
      text: 'If this Pokemon has a Pokemon Tool attached, this attack does 40 more damage.'
    }
  ];

  public regulationMark = 'I';
  public set: string = 'BLK';
  public setNumber: string = '66';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Cobalion';
  public fullName: string = 'Cobalion SV11B';

  public reduceEffect(store: StoreLike, state: State, effect: any): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const active = opponent.active;

      const specialEnergies = active.cards.filter(card => card.superType === SuperType.ENERGY && (card as EnergyCard).energyType === EnergyType.SPECIAL);
      if (specialEnergies.length === 0) {
        return state; // Nothing to discard
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        active,
        { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        if (selected && selected.length > 0) {
          MOVE_CARDS(store, state, active, opponent.discard, { cards: selected, sourceCard: this });
        }
        return state;
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const active = player.active;

      const toolCards = active.cards.filter(card => card instanceof TrainerCard && card.trainerType === TrainerType.TOOL);

      if (toolCards.length > 0) {
        effect.damage += 40;
      }
    }
    return state;
  }
} 