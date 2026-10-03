import {
  AttachEnergyPrompt,
  CardList,
  CardTarget,
  ChooseCardsPrompt,
  EnergyType,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  SHUFFLE_DECK,
  WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';
import { CLEAN_UP_SUPPORTER } from '../../../game/store/prefabs/trainer-prefabs';

function isMegaEvolutionEx(card: PokemonCard): boolean {
  return card.hasTag(CardTag.POKEMON_SV_MEGA) && card.hasTag(CardTag.POKEMON_ex);
}

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Lida,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  if (
    !WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player, {
      tags: [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex],
    })
  ) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const blockedTargets: CardTarget[] = [];
  let hasMegaEvolutionEx = false;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    if (card instanceof PokemonCard && isMegaEvolutionEx(card)) {
      hasMegaEvolutionEx = true;
    } else {
      blockedTargets.push(target);
    }
  });

  if (!hasMegaEvolutionEx) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: self,
  });

  if (player.deck.cards.length === 0) {
    CLEAN_UP_SUPPORTER(store, effect, player);
    return state;
  }

  const cardList = new CardList();
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
      { min: 0, max: 2, allowCancel: false },
    ),
    (selected) => {
      const cards = selected || [];
      MOVE_CARDS(store, state, player.deck, cardList, { cards: cards, sourceCard: self });
      next();
    },
  );

  if (cardList.cards.length > 0) {
    const energyCount = cardList.cards.length;
    yield store.prompt(
      state,
      new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        cardList,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        {
          allowCancel: false,
          min: energyCount,
          max: energyCount,
          sameTarget: true,
          blockedTo: blockedTargets,
        },
      ),
      (transfers) => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, cardList, target, { cards: [transfer.card], sourceCard: self });
        }
        next();
      },
    );
  }
  return SHUFFLE_DECK(store, state, player);
}

export class Lida extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'M-P';
  public setNumber: string = '143';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lida';
  public fullName: string = 'Lida M-P';
  public text: string = `You can only play this card if 1 of your Mega Pokémon ex was Knocked Out during your opponent\'s last turn.

Search your deck for up to 2 Basic Energy cards and attach them to 1 of your Mega Pokémon ex. Then, shuffle your deck.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (
      !WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player, {
        tags: [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex],
      })
    ) {
      return false;
    }
    let hasMegaEvolutionEx = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      if (card instanceof PokemonCard && isMegaEvolutionEx(card)) {
        hasMegaEvolutionEx = true;
      }
    });
    return hasMegaEvolutionEx;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-stellar-crown/crispin.ts (AttachEnergyPrompt — deck search attach)
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
