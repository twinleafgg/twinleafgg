import {
  PokemonCard,
  Stage,
  CardType,
  CardTag,
  StoreLike,
  State,
  AttachEnergyPrompt,
  EnergyType,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
  SuperType,
  EnergyCard,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Miraidonex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.LIGHTNING];
  public hp: number = 220;
  public weakness = [{ type: CardType.FIGHTING }];
  public retreat = [];
  protected _tags = [CardTag.POKEMON_ex];

  public attacks = [
    {
      name: 'Rapid Draw',
      cost: [CardType.LIGHTNING],
      damage: 20,
      text: 'Draw 2 cards.',
    },
    {
      name: 'Techno Turbo',
      cost: [CardType.LIGHTNING, CardType.LIGHTNING, CardType.LIGHTNING],
      damage: 150,
      text: 'Attach a Basic [L] Energy card from your discard pile to 1 of your Benched Pokémon.',
    },
  ];

  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public set = 'OBF';
  public name: string = 'Miraidon ex';
  public fullName: string = 'Miraidon ex OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.provides.includes(CardType.LIGHTNING)
        );
      });
      if (!hasEnergyInDiscard) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }
    return state;
  }
}
