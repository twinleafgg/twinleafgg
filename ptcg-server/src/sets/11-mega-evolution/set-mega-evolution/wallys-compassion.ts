import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  SlotType,
  CardTarget,
  Player,
} from '../../../game';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  const blocked: CardTarget[] = [];
  let hasMegaPokemon = false;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    if (
      card.hasTag(CardTag.POKEMON_SV_MEGA) &&
      card.hasTag(CardTag.POKEMON_ex) &&
      cardList.damage > 0
    ) {
      hasMegaPokemon = true;
    } else {
      blocked.push(target);
    }
  });

  if (!hasMegaPokemon) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_HEAL,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: false, blocked },
    ),
    (results) => {
      targets = results || [];
      next();
    },
  );

  if (targets.length === 0) {
    return state;
  }

  const target = targets[0];
  const healEffect = new HealEffect(player, target, target.damage);
  store.reduceEffect(state, healEffect);

  const energy = target.cards.filter((c) => c.superType === SuperType.ENERGY);
  MOVE_CARDS(store, state, target, player.hand, { cards: energy, sourceCard: effect.trainerCard });

  return state;
}

export class WallysCompassion extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'MEG';
  public setNumber: string = '132';
  public regulationMark = 'I';
  public name: string = "Wally's Compassion";
  public fullName: string = "Wally's Compassion M1S";
  public text: string =
    'Heal all damage from 1 of your Mega Evolution Pokémon ex. If you do, put all Energy attached to that Pokémon back into your hand.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    let hasMegaPokemon = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      if (
        card.hasTag(CardTag.POKEMON_SV_MEGA) &&
        card.hasTag(CardTag.POKEMON_ex) &&
        cardList.damage > 0
      ) {
        hasMegaPokemon = true;
      }
    });
    if (!hasMegaPokemon) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
