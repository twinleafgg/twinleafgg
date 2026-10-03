import {
  Card,
  CardTag,
  CardTarget,
  CardType,
  EnergyCard,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MovedToActiveEffect } from '../../../game/store/effects/game-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  IS_ABILITY_BLOCKED,
  MOVED_TO_ACTIVE_THIS_TURN,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HeatranGX extends PokemonCard {
  public cardType: CardType[] = [R];
  protected _tags = [CardTag.POKEMON_GX];
  public hp = 190;
  public stage = Stage.BASIC;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Burning Road',
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when this Pokémon moves from your Bench to become your Active Pokémon, you may move any number of [R] Energy from your other Pokémon to it.',
    },
  ];

  public attacks = [
    {
      name: 'Steaming Stomp',
      cost: [R, R, C],
      damage: 130,
      text: '',
    },
    {
      name: 'Hot Burn-GX',
      cost: [R],
      damage: 50,
      damageCalculation: 'x',
      gxAttack: true,
      text: "This attack does 50 damage times the amount of [R] Energy attached to this Pokémon. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Heatran-GX';
  public fullName: string = 'Heatran-GX UNM';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedToActiveEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_TO_ACTIVE_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.ABILITY_USED_MARKER, this)) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];

      let hasEnergyOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === player.active) {
          blockedFrom.push(target);
          return;
        }
        blockedTo.push(target);

        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        const blockedCards: Card[] = [];
        checkProvidedEnergy.energyMap.forEach((em) => {
          if (!em.provides.includes(CardType.FIRE) && !em.provides.includes(CardType.ANY)) {
            blockedCards.push(em.card);
          }
        });
        const blocked: number[] = [];
        blockedCards.forEach((bc) => {
          const index = cardList.cards.indexOf(bc);
          if (index !== -1 && !blocked.includes(index)) {
            blocked.push(index);
          }
        });
        if (blocked.length > 0) {
          blockedMap.push({ source: target, blocked });
        }

        if (
          cardList.cards.some(
            (c) =>
              c.superType === SuperType.ENERGY &&
              ((c as EnergyCard).provides.includes(CardType.FIRE) ||
                (c as EnergyCard).provides.includes(CardType.ANY)),
          )
        ) {
          hasEnergyOnBench = true;
        }
      });

      if (hasEnergyOnBench === false) {
        return state;
      }

      player.marker.addMarker(this.ABILITY_USED_MARKER, this);

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, blockedTo, blockedFrom, blockedMap },
        ),
        (transfers) => {
          if (!transfers) {
            return;
          }

          for (const transfer of transfers) {
            const target = player.active;
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energyCount = 0;
      checkProvidedEnergyEffect.energyMap.forEach((em) => {
        energyCount += em.provides.filter((cardType) => {
          return cardType === CardType.FIRE || cardType === CardType.ANY;
        }).length;
      });

      effect.damage = energyCount * 50;
    }

    return state;
  }
}
