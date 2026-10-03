import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  ShuffleDeckPrompt,
  SlotType,
  StateUtils,
  GamePhase,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import {
  CheckProvidedEnergyEffect,
  CheckAttackCostEffect,
} from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';

function* useUltimateRay(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  yield store.prompt(
    state,
    new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_TO_BENCH,
      player.deck,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH, SlotType.ACTIVE],
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
      { allowCancel: false, min: 0, max: 3 },
    ),
    (transfers) => {
      transfers = transfers || [];
      for (const transfer of transfers) {
        const target = StateUtils.getTarget(state, player, transfer.to);
        MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: effect.source.getPokemonCard()! });
        next();
      }
    },
  );

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class ArceusDialgaPalkiaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 280;
  public weakness = [{ type: Y }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Ultimate Ray',
      cost: [W, M, C],
      damage: 150,
      text: 'Search your deck for up to 3 basic Energy cards and attach them to your Pokémon in any way you like. Then, shuffle your deck.',
    },
    {
      name: 'Altered Creation-GX',
      cost: [M],
      damage: 0,
      text: "For the rest of this game, your Pokémon's attacks do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance). If this Pokémon has at least 1 extra [W] Energy attached to it (in addition to this attack's cost), when your opponent's Active Pokémon is Knocked Out by damage from those attacks, take 1 more Prize card. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'CEC';
  public name = 'Arceus & Dialga & Palkia-GX';
  public fullName = 'Arceus & Dialga & Palkia GX CEC';
  public setNumber: string = '156';
  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useUltimateRay(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Check if player has used altered creation
      BLOCK_IF_GX_ATTACK_USED(player);

      player.usedGX = true;
      player.alteredCreationDamage = true;

      // Check attached energy
      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkEnergy);

      // Check attack cost
      const checkAttackCost = new CheckAttackCostEffect(player, this.attacks[1]);
      state = store.reduceEffect(state, checkAttackCost);

      // Count Water energies attached
      const waterEnergies = checkEnergy.energyMap.filter(
        (e) => e.provides.includes(CardType.WATER) || e.provides.includes(CardType.ANY),
      );

      // Check if there's at least 1 extra Water energy beyond the Metal cost
      // Since cost is [METAL], any Water energy is "extra"
      if (waterEnergies.length >= 1) {
        player.usedAlteredCreation = true;
        console.log('Used Altered Creation with Extra Water');
      }
    }

    // Apply +30 damage boost to AttackEffect (before damage effects are created)
    // This ensures it's only applied once per attack
    if (effect instanceof DealDamageEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Only apply to attacks targeting opponent's active Pokémon
      if (
        player.alteredCreationDamage === true &&
        effect.target === opponent.active &&
        !effect.damageIncreased
      ) {
        effect.damage += 30;
        effect.damageIncreased = true;
      }
    }

    if (effect instanceof KnockOutEffect) {
      // effect.player is the owner of the knocked-out Pokémon
      const knockedOutOwner = effect.player;
      // Get the attacker (opponent of the knocked-out owner)
      const attacker = StateUtils.getOpponent(state, knockedOutOwner);

      // Only trigger if:
      // 1. The knocked out Pokémon is the attacker's opponent's active (i.e., attacker's target)
      // 2. It occurred during an attack phase
      // 3. It's the attacker's turn
      // 4. The attacker used Altered Creation with extra Water energy
      if (
        effect.target === knockedOutOwner.active &&
        state.phase === GamePhase.ATTACK &&
        state.players[state.activePlayer] === attacker &&
        attacker.usedAlteredCreation === true &&
        !effect.prizeIncreased
      ) {
        effect.prizeCount += 1;
        effect.prizeIncreased = true;
      }
    }
    return state;
  }
}
