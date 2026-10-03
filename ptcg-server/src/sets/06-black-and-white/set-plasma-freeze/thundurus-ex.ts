import { AttachEnergyPrompt, Attack, CardTag, CardTarget, CardType, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType, Weakness } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class ThundurusEX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  protected _tags = [CardTag.POKEMON_EX, CardTag.TEAM_PLASMA];
  public hp: number = 170;
  public weakness: Weakness[] = [{ type: F }];
  public retreat: CardType[] = [C];

  public attacks: Attack[] = [{
    name: 'Raiden Knuckle',
    cost: [L],
    damage: 30,
    text: 'Attach an Energy card from your discard pile to 1 of your Benched Team Plasma Pokémon.'
  }, {
    name: 'Thunderous Noise',
    cost: [L, L, C, C],
    damage: 90,
    text: 'If this Pokémon has any Plasma Energy attached to it, discard an Energy attached to the Defending Pokémon.'
  }];

  public set: string = 'PLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Thundurus-EX';
  public fullName: string = 'Thundurus EX PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raiden Knuckle
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInDiscard = player.discard.cards.some(c => c.superType === SuperType.ENERGY);
      let validTargets = false;
      const blockedTo: CardTarget[] = [];

      player.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }
        const benchPokemon = bench.getPokemonCard();
        if (benchPokemon && benchPokemon.hasTag(CardTag.TEAM_PLASMA)) {
          validTargets = true;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index,
          };
          blockedTo.push(target);
        }
      });

      if (!hasEnergyInDiscard || !validTargets) {
        return state;
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: true, min: 1, max: 1, blockedTo },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Thunderous Noise
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const pokemon = player.active;

      const checkEnergy = new CheckProvidedEnergyEffect(player, pokemon);
      store.reduceEffect(state, checkEnergy);

      let hasPlasmaEnergy: boolean = false;
      checkEnergy.energyMap.forEach(em => {
        const energyCard = em.card;
        if (energyCard.superType === SuperType.ENERGY && energyCard.name === 'Plasma Energy') {
          hasPlasmaEnergy = true;
        }
      });

      if (hasPlasmaEnergy) {
        return DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
      }
    }

    return state;
  }
}
