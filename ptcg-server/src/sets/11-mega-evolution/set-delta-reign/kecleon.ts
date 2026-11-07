import { CardType, ChooseCardsPrompt, GameMessage, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType, getPokemonCardTypes } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { WAS_ATTACK_USED, SHOW_CARDS_TO_PLAYER } from "../../../game/store/prefabs/prefabs";

export class Kecleon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Colorful Whip',
    cost: [C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Reveal any number of Pokémon from your hand, and this attack does 30 damage for each different type of Pokémon you revealed in this way.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Kecleon';
  public fullName: string = 'Kecleon M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Colorful Whip
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const pokemonInHand = player.hand.cards.filter(c => c instanceof PokemonCard);

      if (pokemonInHand.length === 0) {
        effect.damage = 0;
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 0, max: pokemonInHand.length, allowCancel: false },
      ), selected => {
        const cards = selected || [];

        if (cards.length > 0) {
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        }

        const uniqueTypes = new Set<CardType>();
        cards.forEach(card => {
          if (card instanceof PokemonCard) {
            getPokemonCardTypes(card).forEach(type => uniqueTypes.add(type));
          }
        });
        effect.damage = 30 * uniqueTypes.size;
      });
    }

    return state;
  }
}
