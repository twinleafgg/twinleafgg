import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import {
  PowerType, StoreLike, State, GameError, GameMessage, StateUtils,
  PokemonCardList, CardTarget, PlayerType, ChoosePokemonPrompt, SlotType
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { ApplyWeaknessEffect, DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';

function* usePower(next: Function, store: StoreLike, state: State, self: UnownG, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;
  const cardList = StateUtils.findCardList(state, self);

  // check if UnownQ is on player's Bench
  const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
  if (benchIndex === -1) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }
  const pokemonCard = player.bench[benchIndex].getPokemonCard();
  if (pokemonCard !== self) {
    throw new GameError(GameMessage.ILLEGAL_ACTION);
  }

  // Check if player has a Pokemon without tool, other than UnownQ
  let hasPokemonWithoutTool = false;
  const blocked: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    if (cardList.tools.length === 0 && card !== self) {
      hasPokemonWithoutTool = true;
    } else {
      blocked.push(target);
    }
  });

  if (!hasPokemonWithoutTool) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  // everything checked, we are ready to attach UnownQ as a tool.
  return store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { allowCancel: true, blocked }
  ), targets => {
    if (targets && targets.length > 0) {
      // Attach Unown Q as a Pokemon Tool
      MOVE_CARDS(store, state, player.bench[benchIndex], targets[0], { cards: [pokemonCard], sourceCard: self });
      targets[0].tools.push(pokemonCard);

      // Discard other cards
      const unownGSlot = player.bench[benchIndex];
      const unownGCard = unownGSlot.getPokemonCard();

      if (!unownGCard) {
        return state;
      }

      const otherCards = unownGSlot.cards.filter(card =>
        !(card instanceof PokemonCard) &&
        !unownGSlot.getPokemons().includes(card as PokemonCard) &&
        (!unownGSlot.tools || !unownGSlot.tools.includes(card))
      );
      const tools = [...unownGSlot.tools];

      // Move tools to discard first
      if (tools.length > 0) {
        for (const tool of tools) {
          MOVE_CARDS(store, state, unownGSlot, player.discard, { cards: [tool], sourceCard: self });
        }
      }

      // Move other cards to discard
      if (otherCards.length > 0) {
        MOVE_CARDS(store, state, unownGSlot, player.discard, { cards: otherCards });
      }

      unownGSlot.clearEffects();
    }
  });
}

export class UnownG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'GUARD',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Unown G is on your Bench, you may discard all cards attached to Unown G and attach Unown G to 1 of your Pokémon as a Pokémon Tool card. As long as Unown G is attached to a Pokémon, prevent all effects of attacks, excluding damage, done to that Pokémon.'
  }];

  public attacks = [{
    name: 'Hidden Power',
    cost: [P, C],
    damage: 50,
    text: 'If Unown G has any damage counters on it, this attack\'s base damage is 10.'
  }];

  public set: string = 'GE';
  public name: string = 'Unown [G]';
  public fullName: string = 'Unown [G] GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = usePower(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof AttackEffect && effect.target.cards.includes(this) && effect.target.getPokemonCard() !== this) {
      const pokemonCard = effect.target.getPokemonCard();
      const sourceCard = effect.source.getPokemonCard();

      if (pokemonCard !== this) {
        return state;
      }

      if (sourceCard) {
        // if (effect instanceof AbstractAttackEffect && effect.target.cards.includes(this)) {

        // Try to reduce PowerEffect, to check if something is blocking our ability
        try {
          const player = StateUtils.findOwner(state, effect.target);
          const stub = new PowerEffect(player, {
            name: 'test',
            powerType: PowerType.ABILITY,
            text: ''
          }, this);
          store.reduceEffect(state, stub);
        } catch {
          return state;
        }
        // Allow Weakness & Resistance
        if (effect instanceof ApplyWeaknessEffect) {
          return state;
        }
        // Allow damage
        if (effect instanceof PutDamageEffect) {
          return state;
        }
        // Allow damage
        if (effect instanceof DealDamageEffect) {
          return state;
        }

        effect.preventDefault = true;
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.active.damage > 0) {
        effect.damage = 10;
      }
    }

    return state;
  }

}
