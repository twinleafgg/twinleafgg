import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  PokemonCardList,
  SlotType,
} from '../../../game';
import { AbstractAttackEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_MARKER } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: AcerolasMischief,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  if (opponent.getPrizeLeft() > 2) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { min: 1, max: 1, allowCancel: false },
    ),
    (results) => {
      targets = results || [];
      next();
    },
  );

  if (targets.length === 0) {
    return state;
  }

  ADD_MARKER(self.MISCHIEF_MARKER, targets[0], self);
  ADD_MARKER(self.CLEAR_MISCHIEF_MARKER, opponent, self);

  return state;
}

export class AcerolasMischief extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'MEG';
  public regulationMark = 'I';
  public setNumber: string = '113';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Acerola's Mischief";
  public fullName: string = "Acerola's Mischief MEG";
  public text: string =
    'You can use this card only if your opponent has 2 or fewer Prize cards remaining.\n\n' +
    "Choose 1 of your Pokémon in play. During your opponent's next turn, prevent all damage from and effects of attacks done to that Pokémon by your opponent's Pokémon ex.";

  public readonly MISCHIEF_MARKER = 'ACEROLAS_MISCHIEF_MARKER';
  public readonly CLEAR_MISCHIEF_MARKER = 'ACEROLAS_MISCHIEF_CLEAR_MARKER';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }

    const opponent = StateUtils.getOpponent(state, player);
    return opponent.getPrizeLeft() <= 2;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-astral-radiance/roxanne.ts (opponent prize restriction)
    // Ref: set-evolving-skies/boldore.ts (2-marker protect during opponent's next turn)
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (
      effect instanceof AbstractAttackEffect &&
      effect.target.marker.hasMarker(this.MISCHIEF_MARKER, this)
    ) {
      const targetOwner = StateUtils.findOwner(state, effect.target);
      const sourceCard = effect.source.getPokemonCard();

      if (effect.player !== targetOwner && sourceCard && sourceCard.hasTag(CardTag.POKEMON_ex)) {
        effect.preventDefault = true;
        return state;
      }
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.CLEAR_MISCHIEF_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.CLEAR_MISCHIEF_MARKER, this);
      const player = StateUtils.getOpponent(state, effect.player);
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        cardList.marker.removeMarker(this.MISCHIEF_MARKER, this);
      });
    }

    return state;
  }
}
