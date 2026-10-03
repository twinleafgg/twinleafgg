import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  SlotType,
  PokemonCardList,
  AttachEnergyPrompt,
  CardTarget,
  DiscardEnergyPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  MOVE_CARD_TO,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Electrodeex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Voltorb';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Extra Energy Bomb',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      knocksOutSelf: true,
      text: "Once during your turn (before your attack), you may discard Electrode ex and all the cards attached to it (this counts as Knocking Out Electrode ex). If you do, search your discard pile for 5 Energy cards and attach them to any of your Pokémon (excluding Pokémon-ex) in any way you like. This power can't be used if Electrode ex is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Crash and Burn',
      cost: [L, C],
      damage: 30,
      damageCalculation: '+',
      text: 'You may discard as many Energy as you like attached to your Pokémon in play. If you do, this attack does 30 damage plus 20 more damage for each Energy you discarded.',
    },
  ];

  public set: string = 'RG';
  public name: string = 'Electrode ex';
  public fullName: string = 'Electrode ex RG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '107';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    //Extra Energy Bomb
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      ABILITY_USED(player, this);

      // Find Electrode's slot and move attached cards to discard first,
      // so energy that was attached becomes available for the prompt
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;

      const pokemons = cardList.getPokemons();
      const attachedCards = cardList.cards.filter((c) => !pokemons.includes(c as PokemonCard));
      const tools = cardList.tools.slice();

      attachedCards.forEach((c) => MOVE_CARDS(store, state, cardList, player.discard, { cards: [c], sourceCard: this }));
      tools.forEach((c) => MOVE_CARDS(store, state, cardList, player.discard, { cards: [c], sourceCard: this }));

      // Mark for KO - engine will handle the actual KO (prizes, slot cleanup)
      cardList.damage += 999;

      // Block Pokemon-ex from receiving energy
      let validTargets = 0;
      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (card.hasTag(CardTag.POKEMON_ex)) {
          blocked2.push(target);
        }
        validTargets++;
      });

      if (validTargets === 0) {
        return state;
      }

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
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARD_TO(state, transfer.card, target);
          }
        },
      );
    }

    //Power Move attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let totalEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const energyCount = cardList.cards.filter(
          (card) => card.superType === SuperType.ENERGY,
        ).length;
        totalEnergy += energyCount;
      });

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { min: 1, max: totalEnergy, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            return state;
          }

          // Move all selected energies to discard
          transfers.forEach((transfer) => {
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, player.discard, { cards: [transfer.card], sourceCard: this });
          });

          // Set damage based on number of discarded cards
          effect.damage += transfers.length * 20;
          return state;
        },
      );
    }
    return state;
  }
}
