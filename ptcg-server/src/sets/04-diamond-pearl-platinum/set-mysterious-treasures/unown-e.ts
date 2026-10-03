import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage, StateUtils, PokemonCardList, CardTarget, PlayerType, ChoosePokemonPrompt, SlotType } from '../../../game';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

function* usePower(next: Function, store: StoreLike, state: State, self: UnownE, effect: PowerEffect): IterableIterator<State> {
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
      // Get the slot and card before moving anything
      const unownESlot = player.bench[benchIndex];
      const unownECard = unownESlot.getPokemonCard();

      if (!unownECard) {
        return state;
      }

      // Move all attached cards to discard first
      const otherCards = unownESlot.cards.filter(card =>
        !(card instanceof PokemonCard) &&
        !unownESlot.getPokemons().includes(card as PokemonCard) &&
        (!unownESlot.tools || !unownESlot.tools.includes(card))
      );
      const tools = [...unownESlot.tools];

      // Move tools to discard first
      if (tools.length > 0) {
        for (const tool of tools) {
          MOVE_CARDS(store, state, unownESlot, player.discard, { cards: [tool], sourceCard: self });
        }
      }

      // Move other cards to discard
      if (otherCards.length > 0) {
        MOVE_CARDS(store, state, unownESlot, player.discard, { cards: otherCards });
      }

      // Now attach Unown E as a Pokemon Tool
      MOVE_CARDS(store, state, unownESlot, targets[0], { cards: [unownECard], sourceCard: self });
      targets[0].tools.push(unownECard);

      unownESlot.clearEffects();
    }
  });
}

export class UnownE extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'EQUIP',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Unown E is on your Bench, you may discard all cards attached to Unown E and attach Unown E to 1 of your Pokémon as a Pokémon Tool card. As long as Unown E is attached to a Pokémon, that Pokémon gets +10 HP.'
  }];

  public attacks = [{
    name: 'Hidden Power',
    cost: [C, C],
    damage: 0,
    text: '**THIS ATTACK DOES NOT WORK LIL BRO**\n\nDuring your opponent\'s next turn, whenever your opponent flips a coin, treat it as tails.'
  }];

  public set: string = 'MT';
  public name: string = 'Unown [E]';
  public fullName: string = 'Unown [E] MT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '65';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = usePower(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this) && effect.target.getPokemonCard() !== this) {
      const card = effect.target.getPokemonCard();

      if (card === undefined) {
        return state;
      }

      if (card.stage === Stage.BASIC) {
        effect.hp += 10;
      }
      return state;
    }

    return state;
  }

}
