import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, PowerType, CardTarget, PlayerType, SlotType, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ADD_CONFUSION_TO_PLAYER_ACTIVE, AFTER_ATTACK, BLOCK_IF_HAS_SPECIAL_CONDITION, DRAW_CARDS_UNTIL_CARDS_IN_HAND, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { CardList } from '../../../game/store/state/card-list';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { PowerEffect } from '../../../game/store/effects/game-effects';

function* useTearAway(next: Function, store: StoreLike, state: State, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;

  BLOCK_IF_HAS_SPECIAL_CONDITION(player, effect.card);

  let pokemonsWithTool = 0;
  const blocked: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    if (cardList.tools.length > 0) {
      pokemonsWithTool += 1;
    } else {
      blocked.push(target);
    }
  });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  const max = Math.min(1, pokemonsWithTool);
  let targets: PokemonCardList[] = [];
  yield store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { min: 1, max: max, allowCancel: true, blocked }
  ), results => {
    targets = results || [];
    next();
  });

  if (targets.length === 0) {
    return state;
  }

  const target = targets[0];
  const owner = StateUtils.findOwner(state, target);

  if (target.tools.length > 0) {
    if (target.tools.length > 1) {
      const toolsList = new CardList();
      toolsList.cards = [...target.tools];
      let selected: Card[] = [];
      yield store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_TOOL,
        toolsList,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), results => {
        selected = results || [];
        next();
      });

      if (selected && selected.length > 0) {
        MOVE_CARDS(store, state, target, owner.hand, { cards: [selected[0]], sourceCard: effect.card });
      }
    } else {
      MOVE_CARDS(store, state, target, owner.hand, { cards: [target.tools[0]], sourceCard: effect.card });
    }
  }

  return state;
}

export class Porygon2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Porygon';
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: '3-D Reset',
    text: 'As often as you like during your turn (before your attack), return a Pokémon Tool card attached to 1 of your Pokémon to your hand. This power can\'t be used if Porygon2 is affected by a Special Condition.',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER
  }];

  public attacks = [{
    name: 'Data Retrieval',
    cost: [C],
    damage: 0,
    text: 'If you have less than 8 cards in your hand, draw cards until you have 8 cards in your hand.'
  },
  {
    name: 'Scramble Trip',
    cost: [C, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If Porygon2 has a Scramble Energy card attached to it, this attack does 40 damage plus 20 more damage and the Defending Pokémon is now Confused.'
  }];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Porygon2';
  public fullName: string = 'Porygon2 UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useTearAway(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS_UNTIL_CARDS_IN_HAND(effect.player, 8);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (player.active.cards.some(c => c.name === 'Scramble Energy')) {
        effect.damage += 20;
      }
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.active.cards.some(c => c.name === 'Scramble Energy')) {
        ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, opponent, this);
      }
    }

    return state;
  }
}