import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  GameMessage,
  PlayerType,
  SlotType,
  GameError,
  AttachEnergyPrompt,
  StateUtils,
  CardTarget,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { DiscardEnergyPrompt } from '../../../game/store/prompts/discard-energy-prompt';
import {BLOCK_IF_GX_ATTACK_USED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ElectrodeGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Voltorb';

  public cardType: CardType[] = [CardType.LIGHTNING];

  public hp: number = 190;

  public weakness = [{ type: CardType.FIGHTING }];

  public resistance = [{ type: CardType.METAL, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Extra Energy Bomb',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      knocksOutSelf: true,
      text: 'Once during your turn (before your attack), you may attach 5 Energy cards from your discard pile to your Pokémon, except Pokémon-GX or Pokémon-EX, in any way you like. If you do, this Pokémon is Knocked Out.',
    },
  ];

  public attacks = [
    {
      name: 'Electro Ball',
      cost: [CardType.LIGHTNING, CardType.COLORLESS],
      damage: 50,
      text: '',
    },
    {
      name: 'Crash and Burn-GX',
      cost: [CardType.LIGHTNING, CardType.COLORLESS],
      damage: 30,
      damageCalculation: '+',
      gxAttack: true,
      text: "Discard any amount of Energy from your Pokémon. This attack does 50 more damage for each card you discarded in this way. (You can't use more than 1 GX attack in a game.) ",
    },
  ];

  public set: string = 'CES';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '48';

  public name: string = 'Electrode-GX';

  public fullName: string = 'Electrode-GX CES';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.discard.cards.some((c) => {
        return c.superType === SuperType.ENERGY;
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (card.hasTag(CardTag.POKEMON_EX)) {
          blocked2.push(target);
        }
        if (card.hasTag(CardTag.POKEMON_GX)) {
          blocked2.push(target);
        }
      });

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: 5, blockedTo: blocked2 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
              if (cardList.getPokemonCard() === this) {
                cardList.damage += 999;
                return state;
              }
            });
          }
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
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);

      // return store.prompt(state, new ChoosePokemonPrompt(
      //   player.id,
      //   GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
      //   PlayerType.BOTTOM_PLAYER,
      //   [SlotType.ACTIVE, SlotType.BENCH],
      //   { min: 1, max: 6, allowCancel: true }
      // ), targets => {
      //   targets.forEach(target => {

      let totalEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const energyCount = cardList.cards.filter(
          (card) => card.superType === SuperType.ENERGY,
        ).length;
        totalEnergy += energyCount;
      });

      console.log('Total Energy: ' + totalEnergy);

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH], // Card source is target Pokemon
          { superType: SuperType.ENERGY },
          { min: 1, max: totalEnergy, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            let totalDiscarded = 0;

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = player.discard;
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });

            totalDiscarded = transfers.length;

            effect.damage += totalDiscarded * 50;
            player.usedGX = true;
          }
          console.log('Total Damage: ' + effect.damage);
          return state;
        },
      );
    }
    return state;
  }
}
