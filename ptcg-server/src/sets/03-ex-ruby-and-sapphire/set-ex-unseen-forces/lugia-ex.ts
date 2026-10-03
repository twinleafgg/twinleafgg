import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { Card, ChooseCardsPrompt, ChooseEnergyPrompt, PowerType, StateUtils } from '../../../game';
import {COIN_FLIP_PROMPT,
  IS_POKEBODY_BLOCKED,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { AfterDamageEffect, DiscardCardsEffect } from '../../../game/store/effects/attack-effects';

export class Lugiaex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 100;
  public weakness = [{ type: P }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Silver Sparkle',
      powerType: PowerType.POKEBODY,
      text: "If Lugia ex is your Active Pokémon and is damaged by an opponent's attack (even if Lugia ex is Knocked Out), flip a coin. If heads, choose an Energy card attached to the Attacking Pokémon and return it to your opponent's hand.",
    },
  ];

  public attacks = [
    {
      name: 'Elemental Blast',
      cost: [R, W, L],
      damage: 200,
      text: 'Discard a [R] Energy, [W] Energy, and [L] Energy attached to Lugia ex.',
    },
  ];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Lugia ex';
  public fullName: string = 'Lugia ex UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AfterDamageEffect && effect.target.cards.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (state.phase === GamePhase.ATTACK) {
        COIN_FLIP_PROMPT(store, state, targetPlayer, (result) => {
          if (result) {
            const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
            store.reduceEffect(state, opponentProvidedEnergy);
            const opponentEnergyCount = opponentProvidedEnergy.energyMap.reduce(
              (left, p) => left + p.provides.length,
              0,
            );

            if (opponentEnergyCount === 0) {
              return state;
            }

            store.prompt(
              state,
              new ChooseCardsPrompt(
                targetPlayer,
                GameMessage.CHOOSE_ENERGIES_TO_HAND,
                player.active,
                { superType: SuperType.ENERGY },
                { min: 0, max: 1, allowCancel: false },
              ),
              (selected) => {
                MOVE_CARDS(store, state, player.active, player.hand, { cards: selected, sourceCard: this });
              },
            );
          }
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          [CardType.FIRE, CardType.WATER, CardType.LIGHTNING],
          { allowCancel: false },
        ),
        (energy) => {
          const cards: Card[] = (energy || []).map((e) => e.card);
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
        },
      );
    }

    return state;
  }
}
