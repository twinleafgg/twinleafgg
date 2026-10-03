import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  EnergyType,
  SuperType,
  CardTag,
} from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  MOVE_POKEMON_OFF_BOARD,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class TapuKokoPrismStar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  protected _tags = [CardTag.PRISM_STAR];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Dance of the Ancients',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text:
        'Once during your turn (before your attack), if this Pokémon is on your Bench, ' +
        'you may choose 2 of your Benched Pokémon and attach a [L] Energy card from your discard pile to each of them. ' +
        'If you do, discard all cards from this Pokémon and put it in the Lost Zone.',
    },
  ];

  public attacks = [
    {
      name: 'Mach Bolt',
      cost: [L, L, C],
      damage: 120,
      text: '',
    },
  ];

  public set = 'TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name = 'Tapu Koko Prism Star';
  public fullName = 'Tapu Koko Prism Star TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);

      // Check to see if anything is blocking our Ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player.active.cards[0] == this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
      if (benchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          (c as EnergyCard).provides.includes(CardType.LIGHTNING)
        );
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: false, min: 1, max: 2, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
                pokemonDestination: player.lostzone,
                attachedDestination: player.discard,
                sourceCard: this,
              });
            }
          });

          return state;
        },
      );
    }

    return state;
  }
}
