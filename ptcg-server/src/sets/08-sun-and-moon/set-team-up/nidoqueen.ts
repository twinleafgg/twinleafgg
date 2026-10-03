import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, CardTag, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PokemonCardList, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PowerType } from '../../../game/store/card/pokemon-types';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Nidoqueen extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Nidorina';
  public cardType: CardType[] = [P];
  public hp = 160;
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Queen\'s Call',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your deck for a Pokémon that isn\'t a Pokémon-GX or Pokémon-EX, reveal it, and put it into your hand. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Power Lariat',
    cost: [C, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'This attack does 50 more damage for each Evolution Pokémon on your Bench.'
  }];

  public set: string = 'TEU';
  public setNumber: string = '56';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Nidoqueen';
  public fullName: string = 'Nidoqueen TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Queen's Call Ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && (card.cardTag.includes(CardTag.POKEMON_GX) || card.cardTag.includes(CardTag.POKEMON_EX))) {
          blocked.push(index);
        }
      });
      let chosen: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        chosen = selected || [];
        if (chosen.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: chosen, sourceCard: this });
          store.prompt(state, new ShowCardsPrompt(
            StateUtils.getOpponent(state, player).id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            chosen
          ), () => { });
        }
        store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }
    // Power Lariat
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let evoCount = 0;
      player.bench.forEach((slot: PokemonCardList) => {
        const poke = slot.getPokemonCard();
        if (poke && poke.stage !== Stage.BASIC) {
          evoCount++;
        }
      });
      effect.damage += 50 * evoCount;
      return state;
    }
    return state;
  }
}
