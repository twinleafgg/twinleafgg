import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Card, PlayerType, PowerType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { IS_ABILITY_BLOCKED } from '../../../game/store/prefabs/prefabs';

/** Stamp so filtered re-applies are not blocked again by Sand Screen. */
const IGNORE_SAND_SCREEN = Symbol('ignoreSandScreen');

export class Sandshrew extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [F];

  public hp: number = 60;

  public weakness = [{ type: G }];

  public retreat = [C];

  public powers =
    [{
      name: 'Sand Screen',
      powerType: PowerType.ABILITY,
      text: 'Trainer cards in your opponent\'s discard pile can\'t be put into their deck by an effect of your opponent\'s Item or Supporter cards.'
    }];

  public attacks = [
    {
      name: 'Scratch',
      cost: [C, C],
      damage: 30,
      text: '',
    }
  ];

  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '27';

  public set = 'MEW';

  public name: string = 'Sandshrew';

  public fullName: string = 'Sandshrew MEW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (!(effect instanceof MoveCardsEffect)) {
      return state;
    }

    if ((effect as any)[IGNORE_SAND_SCREEN]) {
      return state;
    }

    // Find Sandshrew's owner
    let owner: ReturnType<typeof StateUtils.findOwner> | undefined;
    state.players.forEach(player => {
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card === this) {
          owner = player;
        }
      });
    });

    if (!owner) {
      return state;
    }

    if (IS_ABILITY_BLOCKED(store, state, owner, this)) {
      return state;
    }

    const opponent = StateUtils.getOpponent(state, owner);

    // Opponent moving cards from their discard into their deck
    if (effect.source !== opponent.discard || effect.destination !== opponent.deck) {
      return state;
    }

    // Only Item / Supporter effects
    const sourceCard = effect.sourceCard;
    if (!(sourceCard instanceof TrainerCard)) {
      return state;
    }
    if (
      sourceCard.trainerType !== TrainerType.ITEM &&
      sourceCard.trainerType !== TrainerType.SUPPORTER
    ) {
      return state;
    }

    const moved = this.resolveMovedCards(effect);
    const trainers = moved.filter(c => c.superType === SuperType.TRAINER);
    if (trainers.length === 0) {
      return state;
    }

    effect.preventDefault = true;

    // If non-trainers were part of the same move, let those through.
    const nonTrainers = moved.filter(c => c.superType !== SuperType.TRAINER);
    if (nonTrainers.length > 0) {
      const reapply = new MoveCardsEffect(effect.source, effect.destination, {
        cards: nonTrainers,
        toTop: effect.toTop,
        toBottom: effect.toBottom,
        skipCleanup: effect.skipCleanup,
        sourceCard: effect.sourceCard,
        sourceEffect: effect.sourceEffect,
      });
      (reapply as any)[IGNORE_SAND_SCREEN] = true;
      state = store.reduceEffect(state, reapply);
    }

    return state;
  }

  private resolveMovedCards(effect: MoveCardsEffect): Card[] {
    if (effect.cards && effect.cards.length > 0) {
      return [...effect.cards];
    }
    if (effect.count !== undefined && effect.count > 0) {
      return effect.source.cards.slice(0, effect.count);
    }
    // Full-pile move
    return [...effect.source.cards];
  }
}
