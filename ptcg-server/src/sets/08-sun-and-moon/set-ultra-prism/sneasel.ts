import { CardTarget, CardType, ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCardList, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Sneasel extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Sneaky Smash',
    cost: [C],
    damage: 0,
    text: 'You can use this attack only if you go second, and only on your first turn. Discard an Energy from 1 of your opponent\'s Pokémon.'
  }, {
    name: 'Ambush',
    cost: [D],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 more damage.'
  }];

  public set: string = 'UPR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Sneasel';
  public fullName: string = 'Sneasel UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, heads => {
        if (heads) {
          effect.damage += 20;
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {

      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Opponent has no energy cards attached
      if (!opponent.active.energies.cards.some(c => c.superType === SuperType.ENERGY) && !opponent.bench.some(b => b.energies.cards.some(c => c.superType === SuperType.ENERGY))) {
        return state;
      }

      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (!cardList.energies.cards.some(c => c.superType === SuperType.ENERGY)) {
          blocked.push(target);
        }
      });

      let targets: PokemonCardList[] = [];
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
        PlayerType.ANY,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), results => {
        targets = results || [];

        if (targets.length === 0) {
          return state;
        }

        return store.prompt(state, new ChooseCardsPrompt(
          opponent,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          targets[0],
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          MOVE_CARDS(store, state, targets[0], opponent.discard, { cards: [selected[0]], sourceCard: this });
          return state;
        });
      });
    }

    return state;
  }
}