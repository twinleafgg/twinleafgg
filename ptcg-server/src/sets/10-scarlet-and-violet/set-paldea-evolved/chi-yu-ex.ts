import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  SlotType,
  AttachEnergyPrompt,
  StateUtils,
} from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ChiYuex extends PokemonCard {
  public regulationMark = 'G';

  protected _tags = [CardTag.POKEMON_ex];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 190;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Jealousy Singe',
      cost: [CardType.FIRE],
      damage: 0,
      text: "Discard the top 2 cards of your opponent's deck.",
    },
    {
      name: 'Flame Surge',
      cost: [CardType.FIRE, CardType.FIRE],
      damage: 100,
      text: 'Choose up to 3 of your Benched Pokémon. For each of those Pokémon, search your deck for a Basic [R] Energy card and attach it to that Pokémon. Then, shuffle your deck.',
    },
  ];

  public set: string = 'PAL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '40';

  public name: string = 'Chi-Yu ex';

  public fullName: string = 'Chi-Yu ex PAL';

  // Implement power
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard 1 card from opponent's deck
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, {
        count: 2,
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasBench = player.bench.some((b) => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { allowCancel: false, min: 0, max: 3, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }
    return state;
  }
}
