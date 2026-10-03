import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { AttachEnergyPrompt, Card, CardTarget, GameMessage, PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, HAS_CARD_IN_DISCARD, IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Moltres extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Flame Charge',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Moltres from your hand onto your Bench, you may flip a coin. If heads, search your discard pile for up to 3 [R] Energy cards and attach them to Moltres.',
  }];

  public attacks = [{
    name: 'Scorching Wing',
    cost: [R, R, C],
    damage: 100,
    text: 'Discard all Fire Energy attached to Moltres.'
  }];

  public set: string = 'MD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Moltres';
  public fullName: string = 'Moltres MD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flame Charge
    if ((effect instanceof PlayPokemonEffect) && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = CONFIRMATION_PROMPT(store, state, effect.player, wantToUse => {
        if (wantToUse) {

          COIN_FLIP_PROMPT(store, state, player, (result) => {
            if (!result) {
              return state;
            }

            if (!HAS_CARD_IN_DISCARD(player, { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' })) {
              return state;
            }

            const moltresSlot = StateUtils.findPokemonSlot(state, this);
            if (!moltresSlot) {
              return state;
            }

            let moltresTarget: CardTarget | undefined;
            const blockedTo: CardTarget[] = [];
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
              if (list === moltresSlot && card === this) {
                moltresTarget = target;
              } else {
                blockedTo.push(target);
              }
            });

            if (!moltresTarget) {
              return state;
            }

            return store.prompt(state, new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_CARDS,
              player.discard,
              PlayerType.BOTTOM_PLAYER,
              [moltresTarget.slot],
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
              { min: 0, max: 3, allowCancel: false, sameTarget: true, blockedTo }
            ), transfers => {
              transfers = transfers || [];
              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
              }
            });
          });
        }
        return state;
      });
    }

    // Scorching Wing
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      const cards: Card[] = checkProvidedEnergy.energyMap
        .filter(e => e.provides.includes(CardType.FIRE) || e.provides.includes(CardType.ANY))
        .map(e => e.card);
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = player.active;
      store.reduceEffect(state, discardEnergy);
    }

    return state;
  }
}