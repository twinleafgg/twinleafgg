import {
  AttachEnergyPrompt,
  CardTarget,
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

import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Milotic extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Feebas';
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Energy Grace',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), you may Knock Out this Pokémon. If you do, attach 3 basic Energy cards from your discard pile to 1 of your Pokémon (excluding Pokémon-EX).',
    },
  ];

  public attacks = [
    {
      name: 'Waterfall',
      cost: [W, C, C],
      damage: 60,
      text: '',
    },
  ];

  public set: string = 'FLF';
  public name: string = 'Milotic';
  public fullName: string = 'Milotic FLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const energyInDiscard = player.discard.cards.filter((c) => {
        return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC;
      }).length;

      if (energyInDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      /*const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC) {
          // Allow basic energy cards to be selected
        } else {
          blocked.push(index);
        }
      });*/

      //Blocks energy from being attached to Pokemon EX
      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (card.hasTag(CardTag.POKEMON_EX)) {
          blocked2.push(target);
        }
      });

      const attachAmount = Math.min(energyInDiscard, 3);

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: attachAmount, max: attachAmount, blockedTo: blocked2 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.damage += 999;
            }
          });
        },
      );

      return state;
    }

    return state;
  }
}
