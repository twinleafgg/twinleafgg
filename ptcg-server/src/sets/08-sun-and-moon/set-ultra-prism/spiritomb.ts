import {
  Card,
  CardType,
  ChooseCardsPrompt,
  GameMessage,
  PokemonCard,
  Stage,
  State,
  StoreLike,
  SuperType,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_CANNOT_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Spiritomb extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 70;
  public retreat = [C];

  public attacks = [{
    name: 'Lightless World',
    cost: [C],
    damage: 0,
    text: 'Put 2 Supporter cards from your discard pile into your hand.'
  },
  {
    name: 'Terrify',
    cost: [C],
    damage: 10,
    text: 'If the Defending Pokémon is a Basic Pokémon, it can\'t attack during your opponent\'s next turn.'
  }];

  public set: string = 'UPR';
  public setNumber: string = '53';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Spiritomb';
  public fullName: string = 'Spiritomb UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lightless World
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      let supporterAmount = 0;

      player.discard.cards.forEach(c => {
        if (c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER) {
          supporterAmount++;
        }
      });

      if (!supporterAmount) {
        return state;
      }

      let cards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 0, max: 2, allowCancel: true }
      ), selected => {
        cards = selected || [];

        if (cards.length > 0) {
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        }
      });
    }

    // Terrify
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.getPokemonCard()?.stage === Stage.BASIC) {
        return DEFENDING_POKEMON_CANNOT_ATTACK(store, state, effect, this);
      }
    }

    return state;
  }
}
