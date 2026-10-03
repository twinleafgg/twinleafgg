import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { PowerType, StoreLike, State, PlayerType, SlotType, MoveEnergyPrompt, StateUtils, PokemonCardList } from '../../../game';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';
import {IS_POKEPOWER_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Shaymin extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 70;

  public weakness = [{ type: CardType.FIRE }];

  public resistance = [{ type: CardType.FIGHTING, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Celebration Wind',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Shaymin from your hand onto ' +
      'your Bench, you may move as many Energy cards attached to your ' +
      'Pokemon as you like to any of your other Pokemon.'
  }];

  public attacks = [
    {
      name: 'Energy Bloom',
      cost: [CardType.GRASS, CardType.COLORLESS],
      damage: 30,
      text: 'Remove 3 damage counters from each of your Pokemon that has ' +
        'any Energy attached to it.'
    }
  ];

  public set: string = 'UL';

  public name: string = 'Shaymin';

  public fullName: string = 'Shaymin UL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        effect.player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true }
      ), transfers => {
        if (transfers === null) {
          return;
        }

        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const targets: PokemonCardList[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const hasEnergy = cardList.cards.some(c => c.superType === SuperType.ENERGY);
        if (hasEnergy && cardList.damage > 0) {
          targets.push(cardList);
        }
      });

      targets.forEach(target => {
        const healEffect = new HealTargetEffect(effect, 30);
        healEffect.target = target;
        store.reduceEffect(state, healEffect);
      });
    }

    return state;
  }

}
