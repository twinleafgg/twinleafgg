import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Flaaffy extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Mareep';
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Spark',
    cost: [L],
    damage: 10,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Tail Code',
    cost: [L, C],
    damage: 30,
    text: 'Move an Energy card attached to the Defending Pokémon to another of your opponent\'s Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Flaaffy';
  public fullName: string = 'Flaaffy PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spark
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const benchedCount = opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchedCount === 0) {
        return state;
      }
      const count = Math.min(2, benchedCount);
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, count, count);
    }

    // Tail Code
    if (WAS_ATTACK_USED(effect, 1, this)) {
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
        { min: 1, max: 1, allowCancel: false, blocked }
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
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (targets && targets.length > 0) {
            MOVE_CARDS(store, state, opponent.active, targets[0], { cards: [cards[0]], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
