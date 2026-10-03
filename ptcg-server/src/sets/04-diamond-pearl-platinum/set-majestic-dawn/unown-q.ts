import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage, StateUtils, PokemonCardList, CardTarget, PlayerType, ChoosePokemonPrompt, SlotType } from '../../../game';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

function* usePower(next: Function, store: StoreLike, state: State, self: UnownQ, effect: PowerEffect): IterableIterator<State> {
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
      const unownQSlot = player.bench[benchIndex];
      const unownQCard = unownQSlot.getPokemonCard();

      if (!unownQCard) {
        return state;
      }

      // Move all attached cards to discard first
      const otherCards = unownQSlot.cards.filter(card =>
        !(card instanceof PokemonCard) &&
        !unownQSlot.getPokemons().includes(card as PokemonCard) &&
        (!unownQSlot.tools || !unownQSlot.tools.includes(card))
      );
      const tools = [...unownQSlot.tools];

      // Move tools to discard first
      if (tools.length > 0) {
        for (const tool of tools) {
          MOVE_CARDS(store, state, unownQSlot, player.discard, { cards: [tool], sourceCard: self });
        }
      }

      // Move other cards to discard
      if (otherCards.length > 0) {
        MOVE_CARDS(store, state, unownQSlot, player.discard, { cards: otherCards });
      }

      // Now attach Unown Q as a Pokemon Tool
      MOVE_CARDS(store, state, unownQSlot, targets[0], { cards: [unownQCard], sourceCard: self });
      targets[0].tools.push(unownQCard);

      unownQSlot.clearEffects();
    }
  });
}

export class UnownQ extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 30;

  public weakness = [{ type: CardType.PSYCHIC, value: 10 }];

  public retreat = [];

  public powers = [{
    name: 'Quick',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Unown Q is on your ' +
      'Bench, you may discard all cards attached to Unown Q and attach Unown Q ' +
      'to 1 of your Pokemon as Pokemon Tool card. As long as Unown Q ' +
      'is attached to a Pokemon, you pay C less to retreat that Pokemon.'
  }];

  public attacks = [
    {
      name: 'Hidden Power',
      cost: [CardType.COLORLESS],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'MD';

  public name: string = 'Unown Q';

  public fullName: string = 'Unown Q MD';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '49';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = usePower(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (index !== -1) {
        effect.cost.splice(index, 1);
      }
      return state;
    }

    return state;
  }

}
