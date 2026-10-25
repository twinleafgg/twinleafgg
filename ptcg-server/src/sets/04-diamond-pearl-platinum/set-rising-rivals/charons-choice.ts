import { CardTarget, ChooseCardsPrompt, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PokemonCard, SlotType, State, StoreLike } from '../../../game';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { MOVE_CARDS, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function isRotom(card: PokemonCard): boolean {
  return card.name.includes('Rotom');
}

export class CharonsChoice extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'RT6';
  public name: string = 'Charon\'s Choice';
  public fullName: string = 'Charon\'s Choice RR';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, put this card into your hand instead of discarding it. Search your deck for any Rotom and switch it with any Rotom you have in play. Any cards attached to Rotom and damage counters on it are now on the new Pokémon. (Remove all Special Conditions and effects from Rotom.) Put Rotom on top of your deck. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && effect.player.supporter.cards.includes(this)) {
      MOVE_CARDS(store, state, effect.player.supporter, effect.player.hand, { cards: [this], sourceCard: this });
    }

    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const blockedInPlay: CardTarget[] = [];
      let hasRotomInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card, target) => {
        if (isRotom(card)) {
          hasRotomInPlay = true;
        } else {
          blockedInPlay.push(target);
        }
      });

      const hasRotomInDeck = player.deck.cards.some(c => c instanceof PokemonCard && isRotom(c));
      if (!hasRotomInPlay || !hasRotomInDeck) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blockedInDeck: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || !isRotom(card)) {
          blockedInDeck.push(index);
        }
      });

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked: blockedInPlay }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        const slot = targets[0];
        const oldRotom = slot.getPokemonCard();
        if (!oldRotom) {
          return;
        }

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: false, blocked: blockedInDeck }
        ), selected => {
          const cards = selected || [];
          if (cards.length === 0) {
            return;
          }

          MOVE_CARDS(store, state, player.deck, slot, { cards, sourceCard: this });
          MOVE_CARDS(store, state, slot, player.deck, { cards: [oldRotom], sourceCard: this, toTop: true });
          slot.clearEffects();
          slot.clearAllSpecialConditions();
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    return state;
  }
}
