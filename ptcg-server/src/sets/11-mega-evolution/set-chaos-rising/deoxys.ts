import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { Card, GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyCard } from '../../../game/store/card/energy-card';

export class Deoxys extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 110;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Genome Charge',
      cost: [C],
      damage: 0,
      text: 'Search your deck for up to 2 Basic [P] Energy cards and attach them to this Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Psychic',
      cost: [P, P, C],
      damage: 80,
      damageCalculation: '+',
      text: "This attack does 20 more damage for each Energy attached to your opponent's Active Pokémon.",
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Deoxys';
  public fullName: string = 'Deoxys M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Genome Charge
    // Ref: set-sword-and-shield/pikachu.ts (ChooseCardsPrompt from deck for energy, attach, shuffle)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const blocked: number[] = [];
      player.deck.cards.forEach((c, index) => {
        if (
          !(c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.provides.includes(P))
        ) {
          blocked.push(index);
        }
      });

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 2, allowCancel: false, blocked },
        ),
        (cards: Card[]) => {
          cards = cards || [];
          if (cards.length > 0) {
            const cardList = StateUtils.findCardList(state, this);
            if (cardList) {
              MOVE_CARDS(store, state, player.deck, cardList, { cards: cards, sourceCard: this });
            }
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Attack 2: Psychic
    // Ref: set-burning-shadows/shiinotic.ts (CheckProvidedEnergyEffect on opponent)
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const checkEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, checkEnergy);

      const energyCount = checkEnergy.energyMap.reduce((sum, em) => sum + em.provides.length, 0);
      effect.damage += 20 * energyCount;
    }

    return state;
  }
}
