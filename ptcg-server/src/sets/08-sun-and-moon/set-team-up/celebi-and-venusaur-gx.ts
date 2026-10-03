import { CardTag, CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {ADD_BURN_TO_PLAYER_ACTIVE,
  ADD_CONFUSION_TO_PLAYER_ACTIVE,
  ADD_POISON_TO_PLAYER_ACTIVE,
  BLOCK_IF_GX_ATTACK_USED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { HealEffect } from '../../../game/store/effects/game-effects';

export class CelebiVenusaurGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 270;
  public weakness = [{ type: R }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Pollen Hazard',
      cost: [G, C, C],
      damage: 50,
      text: "Your opponent's Active Pokémon is now Burned, Confused, and Poisoned.",
    },
    {
      name: 'Solar Beam',
      cost: [G, G, C, C],
      damage: 150,
      text: '',
    },
    {
      name: 'Evergreen-GX',
      cost: [G, G, C, C],
      damage: 180,
      gxAttack: true,
      text: "Heal all damage from this Pokémon. If this Pokémon has at least 1 extra [G] Energy attached to it (in addition to this attack's cost), shuffle all cards from your discard pile into your deck. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set = 'TEU';
  public setNumber = '1';
  public cardImage = 'assets/cardback.png';
  public name = 'Celebi & Venusaur-GX';
  public fullName = 'Celebi & Venusaur-GX TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Pollen Hazard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_BURN_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
      ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
      ADD_POISON_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    // Evergreen-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const healing = new HealEffect(player, player.active, player.active.damage);
      healing.target = player.active;
      store.reduceEffect(state, healing);

      const extraEffectCost: CardType[] = [G, G, G, C, C];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (meetsExtraEffectCost) {
        MOVE_CARDS(store, state, player.discard, player.deck, { sourceCard: this });
        SHUFFLE_DECK(store, state, player);
      }
    }

    return state;
  }
}
