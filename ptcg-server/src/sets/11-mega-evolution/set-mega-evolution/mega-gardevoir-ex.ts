import {
  AttachEnergyPrompt,
  CardTag,
  CardType,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaGardevoirex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Kirlia';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 360;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Overflowing Wishes',
      cost: [P],
      damage: 0,
      text: 'For each of your Benched Pokemon, search your deck for a Basic [P] Energy and attach it to that Pokemon. Then, shuffle your deck.',
    },
    {
      name: 'Mega Symphonia',
      cost: [P],
      damage: 50,
      damageCalculation: 'x',
      text: 'This attack does 50 damage for each [P] Energy attached to all of your Pokemon.',
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'MEG';
  public setNumber: string = '60';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Gardevoir ex';
  public fullName: string = 'Mega Gardevoir ex M1S';

  public readonly MEGA_BRAVE_MARKER = 'MEGA_BRAVE_MARKER';
  public readonly CLEAR_MEGA_BRAVE_MARKER = 'CLEAR_MEGA_BRAVE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Overflowing Wishes
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasBenched = player.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }
      if (player.deck.cards.length === 0) {
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
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Psychic Energy' },
          { allowCancel: false, differentTargets: true },
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
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Mega Symphonia
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let energies = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);
        checkProvidedEnergyEffect.energyMap.forEach((energy) => {
          energies += energy.provides.filter(
            (t) => t === CardType.PSYCHIC || t === CardType.ANY
          ).length;
        });
      });

      effect.damage = energies * 50;
    }

    return state;
  }
}
