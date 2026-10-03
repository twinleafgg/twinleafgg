import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, PowerType, CardTarget, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {MOVE_CARD_TO, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { TrainerType } from '../../../game/store/card/card-types';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { PowerEffect } from '../../../game/store/effects/game-effects';

function* useTearAway(next: Function, store: StoreLike, state: State, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;

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

  targets.forEach(target => {
    const owner = StateUtils.findOwner(state, target);
    if (target.tools.length > 0) {
      if (target.tools.length > 1) {
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_TOOL,
          target,
          { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          if (selected && selected.length > 0) {
            MOVE_CARD_TO(state, selected[0], owner.hand);
          }
        });
      } else {
        MOVE_CARDS(store, state, target, owner.hand, { cards: [target.tools[0]], sourceCard: effect.card });
      }
    }
  });

  return state;
}

export class Weavile extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Sneasel';
  public cardType: CardType[] = [D];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Tear Away',
    text: 'As often as you like during your turn (before your attack), you may put a Pokémon Tool card attached to 1 of your Pokémon into your hand.',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Slash',
    cost: [D, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'STS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Weavile';
  public fullName: string = 'Weavile STS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useTearAway(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}