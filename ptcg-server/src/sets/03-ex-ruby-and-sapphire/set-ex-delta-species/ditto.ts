import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike, State, StateUtils, GameMessage,
  Player,
  PowerType,
  PokemonCardList,
  GameError,
  ChooseCardsPrompt,
  GameLog
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { CheckProvidedEnergyEffect, CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import {ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { COPY_ATTACK_FROM_POKEMON_LIST } from '../../../game/store/prefabs/copy-attack-prefabs';

export class Ditto extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'Duplicate',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your deck for another Ditto and switch it with Ditto. (Any cards attached to Ditto, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) If you do, put Ditto on top of your deck. Shuffle your deck afterward. You can\'t use more than 1 Duplicate Poké-Power each turn.'
  }];

  public attacks = [{
    name: 'Copy',
    cost: [C],
    damage: 0,
    copycatAttack: true,
    text: 'Choose 1 of the Defending Pokémon\'s attacks. Copy copies that attack. This attack does nothing if Ditto doesn\'t have the Energy necessary to use that attack. (You must still do anything else required for that attack.) Ditto performs that attack.'
  }];

  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Ditto';
  public fullName: string = 'Ditto DS';

  public readonly DUPLICATE_MARKER = 'DUPLICATE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DUPLICATE_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }

      if (HAS_MARKER(this.DUPLICATE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];

      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Ditto') {
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
        ADD_MARKER(this.DUPLICATE_MARKER, player, this);
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active.getPokemonCard();

      if (!opponentActive) {
        return state;
      }

      const { blocked } = this.buildEnergyBlockedAttacks(state, store, player, opponentActive);

      return COPY_ATTACK_FROM_POKEMON_LIST(store, state, effect as AttackEffect, [opponentActive], {
        allowCancel: true,
        blocked,
      });
    }
    return state;
  }

  private buildEnergyBlockedAttacks(
    state: State,
    store: StoreLike,
    player: Player,
    card: PokemonCard,
  ): { blocked: { index: number; attack: string }[] } {
    const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
    store.reduceEffect(state, checkProvidedEnergyEffect);
    const energyMap = checkProvidedEnergyEffect.energyMap;

    const blocked: { index: number; attack: string }[] = [];
    const affordableAttacks = card.attacks.filter(attack => {
      const checkAttackCost = new CheckAttackCostEffect(player, attack);
      state = store.reduceEffect(state, checkAttackCost);
      return StateUtils.checkEnoughEnergy(energyMap, checkAttackCost.cost as CardType[]);
    });
    card.attacks.forEach(attack => {
      if (!affordableAttacks.includes(attack)) {
        blocked.push({ index: 0, attack: attack.name });
      }
    });

    return { blocked };
  }
}
