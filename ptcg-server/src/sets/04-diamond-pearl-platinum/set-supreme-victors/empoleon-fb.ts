import { Card, ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, THIS_ATTACK_DOES_X_MORE_DAMAGE, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class EmpoleonFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: L, value: +30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Rushing Water',
    cost: [W, C],
    damage: 20,
    text: 'Move an Energy card attached to the Defending Pokémon to another of your opponent\'s Pokémon.'
  }, {
    name: 'Escort',
    cost: [W, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If you played any Supporter card from your hand during this turn, this attack does 40 damage plus 20 more damage.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Empoleon FB';
  public fullName: string = 'Empoleon FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rushing Water
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasEnergy = opponent.active.cards.some(c => c.superType === SuperType.ENERGY);
      const hasOtherPokemon = opponent.bench.some(b => b.cards.length > 0);
      if (!hasEnergy || !hasOtherPokemon) {
        return state;
      }
      const blocked: number[] = [];
      opponent.active.cards.forEach((card, index) => {
        if (card.superType !== SuperType.ENERGY) {
          blocked.push(index);
        }
      });
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        opponent.active,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blocked },
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length === 0) {
          return;
        }
        return store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ), targets => {
          if (targets && targets.length > 0) {
            MOVE_CARDS(store, state, opponent.active, targets[0], { cards: [cards[0]], sourceCard: this });
          }
        });
      });
    }

    // Escort
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.supporterTurn > 0) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 20);
      }
    }

    return state;
  }
}
