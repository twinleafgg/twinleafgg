import {
  AttachEnergyPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import {
  CardTag,
  CardType,
  EnergyType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cinderace extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Raboot';
  protected _tags = [CardTag.PLAY_DURING_SETUP];
  public cardType: CardType[] = [R];
  public hp: number = 160;
  public weakness = [{ type: W }];
  public retreat = [];

  public powers = [
    {
      name: 'Explosiveness',
      powerType: PowerType.ABILITY,
      text: 'If this Pokémon is in your hand when you are setting up to play, you may put it face down as your Active Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Flame Turbo',
      cost: [C],
      damage: 50,
      text: 'Search your deck for up to 3 Basic Energy cards and attach them to your Benched Pokémon in any way you like. Then, shuffle your deck.',
    },
  ];

  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public name: string = 'Cinderace';
  public fullName: string = 'Cinderace M1L';
  public regulationMark = 'I';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: 3 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );

      SHUFFLE_DECK(store, state, player);
    }

    return state;
  }
}
