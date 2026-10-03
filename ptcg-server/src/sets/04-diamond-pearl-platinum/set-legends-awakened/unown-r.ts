import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils, GameError, GameMessage, PokemonCardList, MoveEnergyPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS, MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';

function* useHiddenPower(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  return store.prompt(state, new MoveEnergyPrompt(
    effect.player.id,
    GameMessage.MOVE_ENERGY_CARDS,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
    { allowCancel: true }
  ), transfers => {
    if (transfers === null) {
      return;
    }

    for (const transfer of transfers) {
      const source = StateUtils.getTarget(state, player, transfer.from);
      const target = StateUtils.getTarget(state, player, transfer.to);
      MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: effect.source.getPokemonCard()! });
    }
  });
}

export class UnownR extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 60;

  public weakness = [{ type: CardType.PSYCHIC, value: 10 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Retire',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, if Unown R is on your Bench, you may ' +
      'discard Unown R and all cards attached to it. (This doesn\'t count ' +
      'as a Knocked Out Pokémon.) Then, draw a card.'
  }];

  public attacks = [
    {
      name: 'Hidden Power',
      cost: [],
      damage: 0,
      text: 'Move any number of basic Energy cards attached to your Pokémon ' +
        'to your other Pokémon in any way you like.'
    }
  ];

  public set: string = 'LA';

  public name: string = 'Unown R';

  public fullName: string = 'Unown R LA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '77';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);

      // check if UnownR is on player's Bench
      const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
      if (benchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_POKEMON_OFF_BOARD(store, state, player.bench[benchIndex], {
        pokemonDestination: player.discard,
        sourceCard: this,
      });
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useHiddenPower(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }

}
