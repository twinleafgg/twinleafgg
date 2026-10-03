import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, SelectPrompt } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RayquazaV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V, CardTag.RAPID_STRIKE];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 210;

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Dragon Pulse',
      cost: [CardType.LIGHTNING],
      damage: 40,
      text: 'Discard the top 2 cards of your deck.',
    },
    {
      name: 'Spiral Burst',
      cost: [CardType.FIRE, CardType.LIGHTNING],
      damage: 20,
      text: 'You may discard up to 2 basic [R] Energy or up to 2 basic [L] Energy from this Pokémon. This attack does 80 more damage for each card you discarded in this way.',
    },
  ];

  public set: string = 'EVS';

  public regulationMark = 'E';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '110';

  public name: string = 'Rayquaza V';

  public fullName: string = 'Rayquaza V EVS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Discard 4 cards from your deck
      MOVE_CARDS(store, state, player.deck, player.discard, { count: 2, sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.ALL_FIRE_ENERGIES,
          action: () => {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.active,
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
                { min: 1, max: 2, allowCancel: false },
              ),
              (selected) => {
                const cards = selected || [];
                if (cards.length > 0) {
                  let totalDiscarded = 0;

                  const discardEnergy = new DiscardCardsEffect(effect, cards);
                  discardEnergy.target = player.active;

                  totalDiscarded += discardEnergy.cards.length;
                  effect.damage = totalDiscarded * 80 + 20;
                  store.reduceEffect(state, discardEnergy);
                }
              },
            );
          },
        },

        {
          message: GameMessage.ALL_LIGHTNING_ENERGIES,
          action: () => {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.active,
                {
                  superType: SuperType.ENERGY,
                  energyType: EnergyType.BASIC,
                  name: 'Lightning Energy',
                },
                { min: 1, max: 2, allowCancel: false },
              ),
              (selected) => {
                const cards = selected || [];
                if (cards.length > 0) {
                  let totalDiscarded = 0;

                  const discardEnergy = new DiscardCardsEffect(effect, cards);
                  discardEnergy.target = player.active;

                  totalDiscarded += discardEnergy.cards.length;
                  effect.damage = totalDiscarded * 80 + 20;
                  store.reduceEffect(state, discardEnergy);
                }
              },
            );
          },
        },
      ];
      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          options.map((opt) => opt.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          option.action();
        },
      );
    }
    return state;
  }
}
