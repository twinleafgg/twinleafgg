import { PokemonCard, CardTag, CardType, Stage, SuperType, ChooseCardsPrompt, GameError, GameLog, GameMessage, PlayerType, PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect } from '../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { ABILITY_USED, ADD_MARKER, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED } from '../../game/store/prefabs/prefabs';

export class Deoxys extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    // Form Change
    name: 'Form Change',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your deck for another Deoxys and switch it with Deoxys. (Any cards attached to Deoxys, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) If you do, put Deoxys on top of your deck. Shuffle your deck afterward. You can\'t use more than 1 Form Change Poké-Power each turn.'
  }];

  public attacks = [{
    // Crystal Laser
    name: 'Crystal Laser',
    cost: [C, C],
    damage: 20,
    text: 'During your next turn, Deoxys\'s attacks do 40 more damage to the Defending Pokémon (before applying Weakness and Resistance).'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Deoxys δ';
  public fullName: string = 'Deoxys δ P4';
  public readonly FORME_CHANGE_MARKER = 'FORME_CHANGE_MARKER';
  public readonly CRYSTAL_LASER_MARKER = 'CRYSTAL_LASER_MARKER';
  public readonly CRYSTAL_LASER_ACTIVE_MARKER = 'CRYSTAL_LASER_ACTIVE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && HAS_MARKER(this.FORME_CHANGE_MARKER, effect.player)) {
      REMOVE_MARKER(this.FORME_CHANGE_MARKER, effect.player);
    }
    if (effect instanceof EndTurnEffect) {
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const hadActive = HAS_MARKER(this.CRYSTAL_LASER_ACTIVE_MARKER, cardList, this);
        const hadPending = HAS_MARKER(this.CRYSTAL_LASER_MARKER, cardList, this);
        if (hadActive) {
          REMOVE_MARKER(this.CRYSTAL_LASER_ACTIVE_MARKER, cardList, this);
        }
        if (hadPending) {
          REMOVE_MARKER(this.CRYSTAL_LASER_MARKER, cardList, this);
          ADD_MARKER(this.CRYSTAL_LASER_ACTIVE_MARKER, cardList, this);
        }
      });
    }
    // Form Change
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.FORME_CHANGE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || !card.name.includes('Deoxys')) {
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
        ADD_MARKER(this.FORME_CHANGE_MARKER, player, this);
        ABILITY_USED(player, this);
      });
    }
    if (effect instanceof AttackEffect && effect.source.getPokemonCard() === this) {
      if (HAS_MARKER(this.CRYSTAL_LASER_ACTIVE_MARKER, effect.source, this)) {
        effect.damage += 40;
      }
    }
    // Crystal Laser
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.CRYSTAL_LASER_MARKER, effect.source, this);
    }
    return state;
  }
}
