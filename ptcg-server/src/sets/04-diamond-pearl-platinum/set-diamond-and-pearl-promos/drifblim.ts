import { Card } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { TrainerCard } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Drifblim extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Drifloon';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: 20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Wind Wave',
    cost: [C],
    damage: 0,
    text: 'Search your discard pile for up to 5 in any combination of Pokémon and Supporter cards. Show them to your opponent and shuffle them into your deck.'
  },
  {
    name: 'Explosive Smoke',
    cost: [P, P, P],
    damage: 60,
    text: 'Does 10 damage to each Benched Pokémon (both yours and your opponent\'s). (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP34';
  public name: string = 'Drifblim';
  public fullName: string = 'Drifblim DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wind Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasValid = player.discard.cards.some(c => {
        return (c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER)
          || c instanceof PokemonCard;
      });
      if (!hasValid) {
        return state;
      }
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        const isPokemon = c instanceof PokemonCard;
        const isSupporter = c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
        if (!isPokemon && !isSupporter) {
          blocked.push(index);
        }
      });
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        {},
        { min: 0, max: 5, allowCancel: true, blocked }
      ), (selected: Card[]) => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.discard, player.deck, { cards, sourceCard: this });
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        SHUFFLE_DECK(store, state, player);
      });
    }

    // Explosive Smoke
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      opponent.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = benchSlot;
          store.reduceEffect(state, damageEffect);
        }
      });
      player.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = benchSlot;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
