import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  MoveEnergyPrompt,
  CardTransfer,
  PlayerType,
  SlotType,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { GameError, GameMessage, StateUtils } from '../../../game';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* moveEnergy(
  next: Function,
  store: StoreLike,
  state: State,
  effect: PowerEffect,
): IterableIterator<State> {
  const player = effect.player;

  let pokemonWithEnergy = 0;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
    if (cardList.cards.some((c) => c.superType === SuperType.ENERGY)) {
      pokemonWithEnergy++;
    }
  });

  if (!pokemonWithEnergy) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  let transfers: CardTransfer[] = [];
  yield store.prompt(
    state,
    new MoveEnergyPrompt(
      player.id,
      GameMessage.MOVE_ENERGY_CARDS,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
      { min: 0, allowCancel: false },
    ),
    (result) => {
      transfers = result || [];
      next();
    },
  );

  if (transfers.length === 0) {
    return state;
  }

  for (const transfer of transfers) {
    const source = StateUtils.getTarget(state, player, transfer.from);
    const target = StateUtils.getTarget(state, player, transfer.to);
    MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: effect.card });
  }

  return state;
}

export class MegaVenusaurEx extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Ivysaur';
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_SV_MEGA];
  public cardType: CardType[] = [G];
  public hp: number = 380;
  public weakness = [{ type: R }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Solar Trans',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: 'As many times as you like during your turn, you may move a Basic [G] Energy from one of your Pokémon to another one of your Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Jungle Dump',
      cost: [G, G, G, G],
      damage: 240,
      text: 'Heal 30 damage from this Pokémon.',
    },
  ];

  public regulationMark = 'I';
  public set: string = 'MEG';
  public setNumber: string = '3';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Venusaur ex';
  public fullName: string = 'Mega Venusaur ex M1L';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = moveEnergy(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const healEffect = new HealEffect(player, player.active, 30);
      state = store.reduceEffect(state, healEffect);
    }

    return state;
  }
}
