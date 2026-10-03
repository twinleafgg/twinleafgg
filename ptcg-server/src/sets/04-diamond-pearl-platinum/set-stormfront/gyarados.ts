import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { Card, StoreLike, State, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, CardTarget, PokemonCardList, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_CARDS, WAS_ATTACK_USED, FLIP_UNTIL_TAILS_AND_COUNT_HEADS } from '../../../game/store/prefabs/prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_FOR_EACH_POKEMON_IN_YOUR_DISCARD_PILE } from '../../../game/store/prefabs/attack-effects';

export class Gyarados extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Magikarp';
  public cardType: CardType[] = [W];
  public hp: number = 130;
  public weakness = [{ type: L, value: +30 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Tail Revenge',
    cost: [],
    damage: 30,
    damageCalculation: 'x',
    text: 'Does 30 damage times the number of Magikarp in your discard pile.'
  }, {
    name: 'Wreak Havoc',
    cost: [W, C],
    damage: 40,
    text: 'Flip a coin until you get tails. For each heads, discard the top card from your opponent\'s deck.'
  }, {
    name: 'Dragon Beat',
    cost: [W, W, C, C, C],
    damage: 100,
    text: 'Flip a coin. If heads, discard an Energy card from each of your opponent\'s Pokémon.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Gyarados';
  public fullName: string = 'Gyarados SF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_FOR_EACH_POKEMON_IN_YOUR_DISCARD_PILE(30, c => c.name === 'Magikarp', effect);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, heads => {
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: heads, sourceCard: this, sourceEffect: this.attacks[1] });
    });
    }

    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          let oppSpecialPokemon = 0;
          let hasPokemonWithEnergy = false;
          const blocked: CardTarget[] = [];
          opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
            if (cardList.cards.some(c => c.superType === SuperType.ENERGY)) {
              hasPokemonWithEnergy = true;
              oppSpecialPokemon++;
            } else {
              blocked.push(target);
            }
          });

          if (!hasPokemonWithEnergy) {
            return state;
          }

          let targets: PokemonCardList[] = [];
          store.prompt(state, new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
            PlayerType.TOP_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { min: oppSpecialPokemon, max: oppSpecialPokemon, allowCancel: false, blocked }
          ), results => {
            targets = results || [];
          });

          if (targets.length === 0) {
            return state;
          }

          const target = targets[0];
          let cards: Card[] = [];
          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            target,
            { superType: SuperType.ENERGY },
            { min: 1, max: 1, allowCancel: false }
          ), selected => {
            cards = selected || [];
          });

          if (cards.length > 0) {
            // Discard selected special energy card
            cards.forEach(card => {
              MOVE_CARDS(store, state, target, opponent.discard, { cards: [card], sourceCard: this });
            });
          }
        }
      });
    }

    return state;
  }

}