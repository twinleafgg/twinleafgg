import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../game/store/card/card-types';
import {
  StoreLike, State, StateUtils, GameMessage,
  PowerType,
  PokemonCardList,
  GameError,
  ChooseCardsPrompt,
  GameLog
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import {ADD_MARKER, HAS_MARKER, HEAL_X_DAMAGE_FROM_THIS_POKEMON, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class SkySplittingDeoxys extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [{
    name: 'Duplicate',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your deck for another Sky-Splitting Deoxys and switch it with Sky-Splitting Deoxys. (Any cards attached to Sky-Splitting Deoxys, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) If you do, put Sky-Splitting Deoxys on top of your deck. Shuffle your deck afterward. You can\'t use more than 1 Forme Change Poké-Power each turn.'
  }];

  public attacks = [{
    name: 'Ozone Drain',
    cost: [P, C, C],
    damage: 40,
    text: 'If Magnetic Storm is in play, remove 3 damage counters from Sky-Splitting Deoxys.'
  }];

  public set: string = 'PCGP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Sky-Splitting Deoxys';
  public fullName: string = 'Sky-Splitting Deoxys PCGP';

  public readonly FORME_CHANGE_MARKER = 'FORME_CHANGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FORME_CHANGE_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }

      if (HAS_MARKER(this.FORME_CHANGE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];

      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== this.name) {
          blocked.push(index);
        }
      });

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked },
      ), (selection) => {
        if (selection.length <= 0) {
          return state;
        }

        const pokemonCard = selection[0];

        if (!(pokemonCard instanceof PokemonCard)) {
          return state;
        }
        store.log(state, GameLog.LOG_PLAYER_TRANSFORMS_INTO_POKEMON, {
          name: player.name,
          pokemon: this.name,
          card: pokemonCard.name,
          effect: effect.power.name,
        });
        MOVE_CARDS(store, state, player.deck, targetCardList, { cards: [pokemonCard], sourceCard: this });
        MOVE_CARDS(store, state, targetCardList, player.deck, { cards: [this], sourceCard: this });

        SHUFFLE_DECK(store, state, player);
        ADD_MARKER(this.FORME_CHANGE_MARKER, player, this);
      });
    }

    // Ozone Drain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard && stadiumCard.name === 'Magnetic Storm') {
        HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 30);
      }
    }

    return state;
  }
}