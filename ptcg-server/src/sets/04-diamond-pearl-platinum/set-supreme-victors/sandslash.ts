import { CardList, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, COIN_FLIP_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Sandslash extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Sandshrew';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Dig Down',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may look at the top 5 cards in your deck. Choose as many Fighting Energy cards as you like, show them to your opponent, and put them into your hand. Put the other cards back on top of your deck. Shuffle your deck afterward. This power can\'t be used if Sandslash is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Needle',
    cost: [F, C, C],
    damage: 40,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed and Poisoned.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Sandslash';
  public fullName: string = 'Sandslash SV';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dig Down
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: Math.min(5, player.deck.cards.length), sourceCard: this });

      const fightingCount = deckTop.cards.filter(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fighting Energy'
      ).length;

      if (fightingCount === 0) {
        MOVE_CARDS(store, state, deckTop, player.deck, { cards: [...deckTop.cards], sourceCard: this });
        SHUFFLE_DECK(store, state, player);
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        deckTop,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { min: 0, max: fightingCount, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, deckTop, player.hand, { cards, sourceCard: this });
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        }
        if (deckTop.cards.length > 0) {
          MOVE_CARDS(store, state, deckTop, player.deck, { cards: [...deckTop.cards], sourceCard: this });
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    // Needle
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
