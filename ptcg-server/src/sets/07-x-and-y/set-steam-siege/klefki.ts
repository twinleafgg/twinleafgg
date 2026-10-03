import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  StateUtils,
  PokemonCardList,
  CardTarget,
  PlayerType,
  ChoosePokemonPrompt,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

function* usePower(
  next: Function,
  store: StoreLike,
  state: State,
  self: Klefki,
  effect: PowerEffect,
): IterableIterator<State> {
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
  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: true, blocked },
    ),
    (targets) => {
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

        const otherCards = unownGSlot.cards.filter(
          (card) =>
            !(card instanceof PokemonCard) &&
            !unownGSlot.getPokemons().includes(card as PokemonCard) &&
            (!unownGSlot.tools || !unownGSlot.tools.includes(card)),
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
    },
  );
}

export class Klefki extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 70;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Wonder Lock',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn (before your attack), if this Pokémon is on your Bench, you may discard all cards attached to this Pokémon and attach it to 1 of your Pokémon as a Pokémon Tool card. Prevent any damage done to the Pokémon this card is attached to by attacks from your opponent's Mega Evolution Pokémon. If this card is attached to a Pokémon, discard this card at the end of your opponent's turn.",
    },
  ];

  public attacks = [
    {
      name: 'Fairy Wind',
      cost: [Y, C],
      damage: 30,
      text: '',
    },
  ];

  public set: string = 'STS';
  public name: string = 'Klefki';
  public fullName: string = 'Klefki STS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = usePower(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    // Wonder Lock: prevent damage to the Pokémon this is attached to from opponent's Mega attacks.
    // AttackEffect has no .target; the defender is effect.opponent.active. Only run when this card
    // is attached to the defender (in target.cards), not when in deck/hand/etc.
    if (effect instanceof AttackEffect) {
      const target = effect.opponent?.active;
      if (!target || !target.cards.includes(this) || target.getPokemonCard() === this) {
        return state;
      }
      const sourceCard = effect.source?.getPokemonCard();
      if (sourceCard && sourceCard.hasTag(CardTag.MEGA)) {
        if (IS_ABILITY_BLOCKED(store, state, effect.player, this)) {
          return state;
        }
        effect.damage = 0;
        effect.preventDefault = true;
      }
    }

    // Discard at end of opponent's turn
    if (effect instanceof EndTurnEffect) {
      const opponent = effect.player;
      const player = StateUtils.getOpponent(state, opponent);
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList) || cardList.getPokemonCard() === this) {
        return state;
      }
      // Do nothing if the end turn effect is for this player (not opponent)
      if (effect.player === StateUtils.findOwner(state, cardList)) {
        return state;
      }

      player.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, index) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this] });
        }
      });
    }

    return state;
  }
}
