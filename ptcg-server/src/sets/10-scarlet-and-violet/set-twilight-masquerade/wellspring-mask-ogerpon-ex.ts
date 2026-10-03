import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  Card,
  ChooseEnergyPrompt,
  ChoosePokemonPrompt,
  ConfirmPrompt,
  GameMessage,
  PlayerType,
  PokemonCard,
  ShuffleDeckPrompt,
  SlotType,
  StateUtils,
} from '../../../game';

import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, TERA_RULE, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class WellspringMaskOgerponex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public hp: number = 210;
  public retreat = [C];

  public attacks = [{
    name: 'Sob',
    cost: [C],
    damage: 20,
    text: 'During your opponent\'s next turn, the Defending Pokémon can\'t retreat.'
  },
  {
    name: 'Torrential Pump',
    cost: [W, C, C],
    damage: 100,
    text: 'You may shuffle 3 Energy attached to this Pokémon into your Deck. If you do, this attack also does 120 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public regulationMark = 'H';
  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Wellspring Mask Ogerpon ex';
  public fullName: string = 'Wellspring Mask Ogerpon ex TWM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sob
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    // Torrential Pump
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some((b) => b.cards.length > 0);

      if (!hasBench) {
        return state;
      }

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (!wantToUse) {
          effect.damage = 100;
          return state;
        }

        state = store.prompt(state, new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
          { allowCancel: false }
        ), energy => {
          const cards: Card[] = (energy || []).map(e => e.card);
          MOVE_CARDS(store, state, player.active, player.deck, { cards: cards, sourceCard: this });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);

            return store.prompt(state, new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
              PlayerType.TOP_PLAYER,
              [SlotType.BENCH],
              { min: 1, max: 1, allowCancel: false }
            ), selected => {
              const target = selected?.[0];
              if (target) {
                const damageEffect = new PutDamageEffect(effect, 120);
                damageEffect.target = target;
                store.reduceEffect(state, damageEffect);
              }
              return state;
            });
          });
        });
        return state;
      });
    }

    TERA_RULE(effect, state, this);

    return state;
  }
}
