import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  Card,
  CardTarget,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {BLOCK_IF_HAS_SPECIAL_CONDITION,
  IS_POKEPOWER_BLOCKED,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class DarkDragonite extends PokemonCard {
  protected _tags = [CardTag.DARK];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Dark Dragonair';
  public cardType: CardType[] = [D];
  public hp: number = 120;
  public weakness = [{ type: C }];
  public resistance = [
    { type: G, value: -30 },
    { type: F, value: -30 },
  ];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Dark Trance',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "As often as you like during your turn (before your attack), you may move a [D] Energy card attached to 1 of your Pokémon to another of your Pokémon. This power can't be used if Dark Dragonite is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Double Wing Attack',
      cost: [W, L],
      damage: 0,
      text: 'Does 30 damage to each Defending Pokémon.',
    },
    {
      name: 'Claw Swipe',
      cost: [C, C, C],
      damage: 50,
      text: '',
    },
  ];

  public set: string = 'TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Dark Dragonite';
  public fullName: string = 'Dark Dragonite TRR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        const blockedCards: Card[] = [];

        checkProvidedEnergy.energyMap.forEach((em) => {
          if (!em.provides.includes(CardType.DARK) && !em.provides.includes(CardType.ANY)) {
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

        if (blocked.length !== 0) {
          blockedMap.push({ source: target, blocked });
        }
      });

      store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: true, blockedMap },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = 30;
    }

    return state;
  }
}
