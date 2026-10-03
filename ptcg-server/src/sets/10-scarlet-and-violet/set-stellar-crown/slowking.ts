import { PokemonCard, Stage, CardType, StoreLike, State, CardList, Card, SuperType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { AttackEffect } from "../../../game/store/effects/game-effects";
import { COPY_ATTACK_FROM_POKEMON_LIST } from "../../../game/store/prefabs/copy-attack-prefabs";
import { WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Slowking extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Slowpoke';
  public cardType: CardType[] = [P];
  public hp: number = 120;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Seek Inspiration',
    cost: [P, C],
    damage: 0,
    copycatAttack: true,
    text: "Discard the top card of your deck, and if that card is a Pokemon that doesn't have a Rule Box, choose 1 of its attacks and use it as this attack. (Pokemon ex, Pokemon V, etc. have Rule Boxes.)",
  },
  {
    name: 'Super Psy Bolt',
    cost: [P, P, C],
    damage: 120,
    text: '',
  }];

  public regulationMark = 'H';
  public set: string = 'SCR';
  public name: string = 'Slowking';
  public fullName: string = 'Slowking SCR';
  public setNumber: string = '58';
  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length <= 0) {
        return state;
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 1, sourceCard: this });
      const topdeck: Card = deckTop.cards[0];
      MOVE_CARDS(store, state, deckTop, player.discard, { sourceCard: this });

      if (!(topdeck instanceof PokemonCard)) {
        return state;
      }

      if (topdeck.hasRuleBox()) {
        return state;
      }

      const discardPokemon = player.discard.cards.filter(
        (card) => card.superType === SuperType.POKEMON,
      ) as PokemonCard[];
      const pokemonInQuestion = discardPokemon.filter((card) => card === topdeck);

      if (pokemonInQuestion.length === 0) {
        return state;
      }

      return COPY_ATTACK_FROM_POKEMON_LIST(store, state, effect as AttackEffect, pokemonInQuestion, {
        allowCancel: true,
      });
    }

    return state;
  }
}
