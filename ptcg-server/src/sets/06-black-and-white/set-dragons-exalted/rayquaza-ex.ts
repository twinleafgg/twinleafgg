import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, CardList, EnergyCard, Card } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { SelectPrompt } from '../../../game/store/prompts/select-prompt';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RayquazaEx extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_EX];
  public cardType: CardType[] = [N];
  public hp: number = 170;
  public weakness = [{ type: N }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Celestial Roar',
      cost: [C],
      damage: 0,
      text: 'Discard the top 3 cards of your deck. If any of those cards are Energy cards, attach them to this Pokémon.',
    },
    {
      name: 'Dragon Burst',
      cost: [R, L],
      damage: 60,
      damageCalculation: 'x',
      text: 'Discard all basic [R] Energy or all basic [L] Energy attached to this Pokémon. This attack does 60 damage times the number of Energy cards you discarded.',
    },
  ];

  public set: string = 'DRX';
  public name: string = 'Rayquaza-EX';
  public fullName: string = 'Rayquaza EX DRX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const temp = new CardList();
      MOVE_CARDS(store, state, player.deck, temp, { count: 3, sourceCard: this });
      const energyCards = temp.cards.filter((c) => c instanceof EnergyCard);
      MOVE_CARDS(store, state, temp, player.active, { cards: energyCards, sourceCard: this });
      MOVE_CARDS(store, state, temp, player.discard, { sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          [GameMessage.ALL_FIRE_ENERGIES, GameMessage.ALL_LIGHTNING_ENERGIES],
          { allowCancel: false },
        ),
        (choice) => {
          const cardType = choice === 0 ? CardType.FIRE : CardType.LIGHTNING;
          let damage = 0;

          const cards: Card[] = [];
          for (const energyMap of checkProvidedEnergy.energyMap) {
            const energy = energyMap.provides.filter((t) => t === cardType || t === CardType.ANY);
            if (energy.length > 0) {
              cards.push(energyMap.card);
              damage += 60 * energy.length;
            }
          }

          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
          effect.damage = damage;
        },
      );
    }

    return state;
  }
}
