import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class DialgaEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX, CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 180;
  public weakness = [{ type: N }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Reverse Edge',
    cost: [P, M, C],
    damage: 50,
    text: 'Flip a coin. If heads, put a card from your discard pile into your hand.'
  }, {
    name: 'Fast Forward',
    cost: [C, C, C, C],
    damage: 90,
    text: 'For each Plasma Energy attached to this Pok\u00e9mon, discard the top card of your opponent\'s deck.'
  }];

  public set: string = 'PLB';
  public setNumber: string = '65';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Dialga-EX';
  public fullName: string = 'Dialga-EX PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.discard.cards.length > 0) {
        COIN_FLIP_PROMPT(store, state, player, (result) => {
          if (result) {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                {},
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                if (selected && selected.length > 0) {
                  MOVE_CARDS(store, state, player.discard, player.hand, { cards: [selected[0]], sourceCard: this });
                }
              },
            );
          }
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Count Plasma Energy attached
      const plasmaCount = player.active.cards.filter(
        (c) => c.superType === SuperType.ENERGY && c.name === 'Plasma Energy',
      ).length;

      if (plasmaCount > 0 && opponent.deck.cards.length > 0) {
        const cardsToDiscard = Math.min(plasmaCount, opponent.deck.cards.length);
        MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: cardsToDiscard });
      }
    }

    return state;
  }
}
