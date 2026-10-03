import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, GameMessage, PlayerType, PowerType, SlotType, StoreLike, State, StateUtils } from '../../../game';
import { CheckPokemonStatsEffect, CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, IS_ABILITY_BLOCKED, BLOCK_IF_GX_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class JirachiGx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 160;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'Psychic Zone',
    powerType: PowerType.ABILITY,
    text: 'Don\'t apply Psychic Weakness when Pokémon (both yours and your opponent\'s) take damage from attacks.'
  }];

  public attacks = [{
    name: 'Star Search',
    cost: [P],
    damage: 0,
    text: 'Search your deck for an Energy card and attach it to 1 of your Psychic Pokémon. Then, shuffle your deck.'
  }, {
    name: 'Star Shield-GX',
    cost: [P, P, P],
    damage: 100,
    text: 'Prevent all effects of attacks, including damage, done to this Pokémon during your opponent\'s next turn. (You can\'t use more than 1 GX attack in a game.)'
  }];

  public set: string = 'UNM';
  public setNumber: string = '79';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Jirachi-GX';
  public fullName: string = 'Jirachi-GX UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psychic Zone
    if (effect instanceof CheckPokemonStatsEffect) {
      let jirachiOwner: any = null;

      for (const p of state.players) {
        p.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (cardList.getPokemonCard() === this) {
            jirachiOwner = p;
          }
        });
      }

      if (!jirachiOwner) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, jirachiOwner, this)) {
        return state;
      }

      effect.weakness = effect.weakness.filter(w => w.type !== CardType.PSYCHIC);
    }

    // Star Search
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const slots: SlotType[] = [];
      const activeCard = player.active.getPokemonCard();
      if (activeCard) {
        const checkType = new CheckPokemonTypeEffect(player.active);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.PSYCHIC)) {
          slots.push(SlotType.ACTIVE);
        }
      }

      player.bench.forEach((b) => {
        if (b.cards.length > 0) {
          const checkType = new CheckPokemonTypeEffect(b);
          store.reduceEffect(state, checkType);
          if (checkType.cardTypes.includes(CardType.PSYCHIC)) {
            if (!slots.includes(SlotType.BENCH)) {
              slots.push(SlotType.BENCH);
            }
          }
        }
      });

      if (slots.length === 0) {
        return SHUFFLE_DECK(store, state, player);
      }

      store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          slots,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Star Shield-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      PREVENT_DAMAGE(store, state, effect, this);
      PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
    }

    return state;
  }
}
