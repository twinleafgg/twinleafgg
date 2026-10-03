import {
  AttachEnergyPrompt,
  Attack,
  CardTag,
  CardType,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  Resistance,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  Weakness,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {DEAL_MORE_DAMAGE_FOR_EACH_PRIZE_CARD_TAKEN,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ShayminEX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  protected _tags = [CardTag.POKEMON_EX];
  public hp: number = 110;
  public weakness: Weakness[] = [{ type: R }];
  public resistance: Resistance[] = [{ type: F, value: -20 }];
  public retreat: CardType[] = [C];

  public attacks: Attack[] = [
    {
      name: 'Synthesis',
      cost: [G],
      damage: 0,
      text: 'Search your deck for a [G] Energy card and attach it to 1 of your Pokémon. Shuffle your deck afterward.',
    },
    {
      name: 'Revenge Blast',
      cost: [G, C],
      damage: 30,
      damageCalculation: '+',
      text: 'Does 30 more damage for each Prize card your opponent has taken.',
    },
  ];

  public set: string = 'NXD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Shaymin-EX';
  public fullName: string = 'Shaymin EX NXD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
          { allowCancel: true, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return SHUFFLE_DECK(store, state, player);
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          return SHUFFLE_DECK(store, state, player);
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DEAL_MORE_DAMAGE_FOR_EACH_PRIZE_CARD_TAKEN(effect, state, 30);
    }

    return state;
  }
}
