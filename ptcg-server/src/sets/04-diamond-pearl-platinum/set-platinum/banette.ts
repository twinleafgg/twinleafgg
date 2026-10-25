import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, ChooseEnergyPrompt, GameError, GameMessage, PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, SHOW_CARDS_TO_PLAYER, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Banette extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shuppet';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Temper Tantrum',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard as many cards as you like from your hand. If you do, put that many damage counters on Banette. This power can\'t be used if Banette is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Darkness Switch',
    cost: [P],
    damage: 0,
    text: 'Discard an Energy card attached to Banette, and then switch all damage counters on Banette with those on the Defending Pokémon. (If an effect of this attack is prevented, this attack does nothing.)'
  }, {
    name: 'Loneliness',
    cost: [P, C],
    damage: 30,
    damageCalculation: '+',
    text: 'You may show your hand to your opponent. If you do and if you don\'t have any Pokémon in your hand, this attack does 30 damage plus 30 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Banette';
  public fullName: string = 'Banette PL';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Temper Tantrum
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      if (player.hand.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { min: 0, max: player.hand.cards.length, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        const banetteList = StateUtils.findCardList(state, this) as PokemonCardList;
        store.reduceEffect(state, new PlaceDamageCountersEffect(
          player,
          banetteList,
          cards.length * 10,
          this,
          this.powers[0]
        ));
      });
    }

    // Darkness Switch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);
      if (checkProvidedEnergy.energyMap.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        checkProvidedEnergy.energyMap,
        [C],
        { allowCancel: false }
      ), energy => {
        const cards: Card[] = (energy || []).map(e => e.card);
        if (cards.length === 0) {
          return;
        }
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
        if (discardEnergy.preventDefault) {
          return;
        }
        const myDamage = player.active.damage;
        const oppDamage = opponent.active.damage;
        player.active.damage = oppDamage;
        opponent.active.damage = myDamage;
      });
    }

    // Loneliness
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      return CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        SHOW_CARDS_TO_PLAYER(store, state, opponent, player.hand.cards);
        const hasPokemon = player.hand.cards.some(c => c.superType === SuperType.POKEMON);
        if (!hasPokemon) {
          effect.damage += 30;
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
