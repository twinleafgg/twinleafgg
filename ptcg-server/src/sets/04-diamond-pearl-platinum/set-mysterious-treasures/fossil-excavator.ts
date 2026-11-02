import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { Stage } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PokemonCard } from '../../../game';
import { SelectPrompt } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function isFossilSearchCard(card: Card): boolean {
  if (card instanceof TrainerCard && (card.name.includes('Fossil') || card.name === 'Old Amber')) {
    return true;
  }
  if (card instanceof PokemonCard && (card.stage === Stage.STAGE_1 || card.stage === Stage.STAGE_2)) {
    return card.evolvesFrom.includes('Fossil') || card.evolvesFrom === 'Old Amber';
  }
  return false;
}

export class FossilExcavator extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'MT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '111';
  public name: string = 'Fossil Excavator';
  public fullName: string = 'Fossil Excavator MT';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Search your deck or discard pile for a Trainer card that has Fossil in its name or a Stage 1 or Stage 2 Evolution card that evolves from a Fossil. Show it to your opponent and put it into your hand. If you searched your deck, shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const options = ['Deck', 'Discard Pile'];
      return store.prompt(state, new SelectPrompt(
        player.id,
        GameMessage.CHOOSE_OPTION,
        options,
        { allowCancel: false }
      ), choice => {
        const fromDeck = choice === 0;
        const source = fromDeck ? player.deck : player.discard;
        const blocked: number[] = [];
        source.cards.forEach((card, index) => {
          if (!isFossilSearchCard(card)) {
            blocked.push(index);
          }
        });
        if (blocked.length === source.cards.length) {
          if (fromDeck) {
            SHUFFLE_DECK(store, state, player);
          }
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          source,
          {},
          { min: 0, max: 1, allowCancel: true, blocked }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            SHOW_CARDS_TO_PLAYER(store, state, StateUtils.getOpponent(state, player), cards);
            MOVE_CARDS(store, state, source, player.hand, { cards, sourceCard: this });
          }
          if (fromDeck) {
            SHUFFLE_DECK(store, state, player);
          }
        });
      });
    }

    return state;
  }
}
