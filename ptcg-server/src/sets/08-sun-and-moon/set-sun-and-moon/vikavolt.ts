import { AttachEnergyPrompt, GameError, GameMessage, PlayerType, PokemonCard, PowerType, ShuffleDeckPrompt, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect, PowerEffect } from '../../../game/store/effects/game-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import {ABILITY_USED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useStrongCharge(next: Function, store: StoreLike, state: State, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  const blocked = player.deck.cards
    .filter(c => c.name !== 'Grass Energy' && c.name !== 'Lightning Energy')
    .map(c => player.deck.cards.indexOf(c));

  yield store.prompt(state, new AttachEnergyPrompt(
    player.id,
    GameMessage.ATTACH_ENERGY_TO_BENCH,
    player.deck,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.BENCH, SlotType.ACTIVE],
    { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
    { allowCancel: false, min: 0, max: 2, blocked }
  ), transfers => {
    transfers = transfers || [];
    for (const transfer of transfers) {

      if (transfers.length > 1) {
        if (transfers[0].card.name === transfers[1].card.name) {
          throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
        }
      }

      const target = StateUtils.getTarget(state, player, transfer.to);
      MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: effect.card });
      next();
    }
  });
  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Vikavolt extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Charjabug';
  public cardType: CardType[] = [L];
  public hp: number = 150;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Strong Charge',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may search your deck for a [G] Energy card and a [L] Energy card and attach them to your Pokémon in any way you like. Then, shuffle your deck.'
  }];
  public attacks = [{
    name: 'Electro Cannon',
    cost: [L, C, C, C],
    damage: 150,
    text: 'Discard 3 Energy from this Pokémon.'
  }];

  public set: string = 'SUM';
  public setNumber: string = '52';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Vikavolt';
  public fullName: string = 'Vikavolt SUM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useStrongCharge(() => generator.next(), store, state, effect);
      ABILITY_USED(effect.player, this);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 3);
    }
    return state;
  }

}
