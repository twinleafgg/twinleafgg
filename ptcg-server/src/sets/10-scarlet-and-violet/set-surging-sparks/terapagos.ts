import {
  PokemonCard,
  Stage,
  CardType,
  StoreLike,
  State,
  GameMessage,
  GameError,
  StateUtils,
  AttachEnergyPrompt,
  CardTag,
  CardTarget,
  EnergyType,
  PlayerType,
  SlotType,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Terapagos extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 120;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Prism Charge',
      cost: [C],
      damage: 0,
      text: 'Search your deck for up to 3 Basic Energy cards of different types and attach them to your Tera Pokémon in any way you like. Then, shuffle your deck.',
    },
    {
      name: 'Hard Tackle',
      cost: [C, C, C],
      damage: 100,
      text: '',
    },
  ];

  public regulationMark = 'H';
  public set: string = 'SSP';
  public setNumber: string = '161';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Terapagos';
  public fullName: string = 'Terapagos SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let teraPokemonInPlay = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.hasTag(CardTag.POKEMON_TERA)) {
          teraPokemonInPlay = true;
        }
      });

      if (!teraPokemonInPlay) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!card.hasTag(CardTag.POKEMON_TERA)) {
          blocked2.push(target);
        }
      });

      // return store.prompt(state, new ChoosePokemonPrompt(
      //   player.id,
      //   GameMessage.ATTACH_ENERGY_TO_BENCH,
      //   PlayerType.BOTTOM_PLAYER,
      //   [SlotType.BENCH, SlotType.ACTIVE],
      //   { min: 0, max: 2, blocked: blocked2 }
      // ), chosen => {

      //   chosen.forEach(target => {

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: 3, blockedTo: blocked2 },
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
          return state;
        },
      );
    }
    return state;
  }
}
