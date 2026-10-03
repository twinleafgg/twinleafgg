import { Card, ChooseCardsPrompt, PokemonCard, Stage, CardType, GameMessage } from '../../../game';
import { EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';

export class Slowpoke extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Fishing Tail',
    cost: [C],
    damage: 0,
    text: 'Search your discard pile for a Basic Pokémon, Evolution card, or basic Energy card, show it to your opponent, and put it into your hand.'
  }, {
    name: 'Trip Over',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 10 more damage.'
  }];

  public set: string = 'UF';
  public name: string = 'Slowpoke';
  public fullName: string = 'Slowpoke UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fishing Tail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let pokemons = 0;
      let energies = 0;
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        if (c instanceof EnergyCard && c.energyType === EnergyType.BASIC) {
          energies += 1;
        } else if (c instanceof PokemonCard) {
          pokemons += 1;
        } else {
          blocked.push(index);
        }
      });

      // Player does not have correct cards in discard
      if (pokemons === 0 && energies === 0) {
        return state;
      }

      const maxPokemons = Math.min(pokemons, 1);
      const maxEnergies = Math.min(energies, 1);

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        {},
        { min: 0, max: 1, allowCancel: false, blocked, maxPokemons, maxEnergies }
      ), selected => {
        cards = selected || [];

        if (cards.length > 0) {

          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards });
        }
      });
      return state;
    }

    // Trip Over
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Flip a coin
      state = COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          effect.damage += 10; // 20 base + 10 for heads
        }
        return state;
      });
    }
    return state;
  }
}
