import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  CardTag,
  CardType,
  EnergyType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  PlayerType,
  AttachEnergyPrompt,
  SlotType,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class VictiniEX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_EX];
  public cardType: CardType[] = [R];
  public hp: number = 110;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Turbo Energize',
      cost: [R],
      damage: 0,
      text: 'Search your deck for 2 basic Energy cards and attach them to your Benched Pokémon in any way you like. Shuffle your deck afterward.',
    },
    {
      name: 'Intensifying Burn',
      cost: [R, C, C],
      damage: 50,
      damageCalculation: '+',
      text: 'If the Defending Pokémon is a Pokémon-EX, this attack does 50 more damage.',
    },
  ];

  public set: string = 'PLS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Victini-EX';
  public fullName: string = 'Victini EX PLS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Turbo Energize
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const openSlots = player.bench.filter((b) => b.cards.length === 0);
      if (!openSlots) {
        return state;
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
          { allowCancel: false, min: 0, max: 2 },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Intensifying Butn
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.getPokemonCard()?.hasTag(CardTag.POKEMON_EX)) {
        effect.damage += 50;
      }
    }

    return state;
  }
}
