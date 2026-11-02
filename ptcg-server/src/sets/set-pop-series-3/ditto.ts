import { PokemonCard, CardType, Stage, SuperType, ChooseCardsPrompt, GameError, GameLog, GameMessage, PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../game/store/prefabs/attack-effects';
import { ABILITY_USED, ADD_MARKER, COIN_FLIP_PROMPT, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED } from '../../game/store/prefabs/prefabs';

export class Ditto extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    // Duplicate
    name: 'Duplicate',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your deck for another Ditto and switch it with Ditto. (Any cards attached to Ditto, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) If you do, put Ditto on top of your deck. Shuffle your deck afterward. You can\'t use more than 1 Duplicate Poké-Power each turn.'
  }];

  public attacks = [{
    // Psybeam
    name: 'Psybeam',
    cost: [P, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Ditto';
  public fullName: string = 'Ditto P3';
  public readonly DUPLICATE_MARKER = 'DUPLICATE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DUPLICATE_MARKER, this);
    // Duplicate
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.DUPLICATE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || card.name !== 'Ditto') {
          blocked.push(index);
        }
      });
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked }
      ), selection => {
        if (selection.length <= 0) {
          return;
        }
        const pokemonCard = selection[0];
        if (!(pokemonCard instanceof PokemonCard)) {
          return;
        }
        store.log(state, GameLog.LOG_PLAYER_TRANSFORMS_INTO_POKEMON, {
          name: player.name,
          pokemon: this.name,
          card: pokemonCard.name,
          effect: effect.power.name
        });
        MOVE_CARDS(store, state, player.deck, targetCardList, { cards: [pokemonCard], sourceCard: this });
        MOVE_CARDS(store, state, targetCardList, player.deck, { cards: [this], sourceCard: this });
        SHUFFLE_DECK(store, state, player);
        ADD_MARKER(this.DUPLICATE_MARKER, player, this);
        ABILITY_USED(player, this);
      });
    }
    // Psybeam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }
    return state;
  }
}
