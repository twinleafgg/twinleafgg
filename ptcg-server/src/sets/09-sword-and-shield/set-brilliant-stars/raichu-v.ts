import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  SlotType,
  StateUtils,
  AttachEnergyPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { DiscardEnergyPrompt } from '../../../game/store/prompts/discard-energy-prompt';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RaichuV extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_V];
  public cardType: CardType[] = [L];
  public hp: number = 200;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Fast Charge',
      cost: [L],
      damage: 0,
      canUseOnFirstTurn: true,
      text: 'If you go first, you can use this attack during your first turn. Search your deck for a [L] Energy card and attach it to this Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Dynamic Spark',
      cost: [L, L],
      damage: 60,
      damageCalculation: 'x',
      text: 'You may discard any amount of [L] Energy from your Pokémon. This attack does 60 damage for each card you discarded in this way.',
    },
  ];

  public regulationMark = 'F';
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Raichu V';
  public fullName: string = 'Raichu V BRS';

  // Implement power
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const cardList = StateUtils.findCardList(state, this);
      if (cardList === undefined) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return state;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }

          SHUFFLE_DECK(store, state, player);
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let totalLightningEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const lightningCount = cardList.cards.filter(
          (card) => card.superType === SuperType.ENERGY && card.name === 'Lightning Energy',
        ).length;
        totalLightningEnergy += lightningCount;
      });

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH], // Card source is target Pokemon
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { min: 1, max: totalLightningEnergy, allowCancel: false },
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

            effect.damage = totalDiscarded * 60;
          }
          return state;
        },
      );
    }
    return state;
  }
}
