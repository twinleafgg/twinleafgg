import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import {
  PowerType, StoreLike, State, StateUtils, GameError, GameMessage,
  PokemonCardList
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED, ADD_MARKER, DRAW_CARDS, HAS_MARKER, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Aipom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 50;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Snappy Move',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Aipom is on your Bench, you may draw a card. Then, discard all cards attached to Aipom and put Aipom on the bottom of your deck. You can\'t use more than 1 Snappy Move Poké-Power each turn.'
  }];

  public attacks = [{
    name: 'Snap tail',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 10 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'UF';
  public name: string = 'Aipom';
  public fullName: string = 'Aipom UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';

  public readonly SNAPPY_MOVE_MARKER = 'SNAPPY_MOVE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && HAS_MARKER(this.SNAPPY_MOVE_MARKER, effect.player)) {
      effect.player.marker.removeMarker(this.SNAPPY_MOVE_MARKER);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);

      // check if on player's Bench
      const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
      if (benchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (HAS_MARKER(this.SNAPPY_MOVE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const aipomSlot = player.bench[benchIndex];
      const aipomCard = aipomSlot.getPokemonCard();

      if (!aipomCard) {
        return state;
      }

      ADD_MARKER(this.SNAPPY_MOVE_MARKER, player, this);
      ABILITY_USED(player, this);
      DRAW_CARDS(store, state, player, 1);

      const pokemons = aipomSlot.getPokemons();
      const otherCards = aipomSlot.cards.filter(card =>
        !(card instanceof PokemonCard) &&
        !pokemons.includes(card as PokemonCard) &&
        (!aipomSlot.tools || !aipomSlot.tools.includes(card))
      );
      const tools = [...aipomSlot.tools];

      // Move tools to discard first
      if (tools.length > 0) {
        for (const tool of tools) {
          MOVE_CARDS(store, state, aipomSlot, player.discard, { cards: [tool], sourceCard: this });
        }
      }

      // Move other cards to discard
      if (otherCards.length > 0) {
        MOVE_CARDS(store, state, aipomSlot, player.discard, { cards: otherCards });
      }

      // Move Pokémon to bottom of deck
      if (pokemons.length > 0) {
        MOVE_CARDS(store, state, aipomSlot, player.deck, { cards: pokemons, toBottom: true });
      }

      aipomSlot.clearEffects();
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state);
    }

    return state;
  }

}
