import { AttachEnergyPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useFlareStarter(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {

  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  let max = 1;
  if (state.turn === 2) {
    max = 3;
  }

  yield store.prompt(state, new AttachEnergyPrompt(
    player.id,
    GameMessage.ATTACH_ENERGY_TO_BENCH,
    player.deck,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.BENCH, SlotType.ACTIVE],
    { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
    { allowCancel: false, min: 0, max }
  ), transfers => {
    transfers = transfers || [];
    for (const transfer of transfers) {
      const target = StateUtils.getTarget(state, player, transfer.to);
      MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: effect.source.getPokemonCard()! });
      next();
    }
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);

  });
}

export class Volcanion extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 120;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [{
    name: 'Flare Starter',
    cost: [CardType.FIRE],
    damage: 0,
    text: 'Search your deck for a [R] Energy card and attach it to 1 of your Pokémon. If you go second and it\'s your first turn, instead search for up to 3 [R] Energy cards and attach them to your Pokémon in any way you like. Then, shuffle your deck.'
  }, {
    name: 'High-Heat Blast',
    cost: [CardType.FIRE, CardType.FIRE],
    damage: 50,
    damageCalculation: '+',
    text: 'If you have at least 4 [R] Energy in play, this attack does 60 more damage.'
  }];

  public set: string = 'UNB';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '25';

  public name: string = 'Volcanion';

  public fullName: string = 'Volcanion UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useFlareStarter(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let energyCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);

        checkProvidedEnergyEffect.energyMap.forEach(em => {
          energyCount += em.provides.filter(cardType => {
            return cardType === CardType.FIRE || cardType === CardType.ANY;
          }).length;
        });
      });

      if (energyCount >= 4)
        effect.damage += 60;

      return state;
    }
    return state;
  }
}
