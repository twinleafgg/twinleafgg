import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, StateUtils, GameMessage, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyType, SuperType } from '../../../game/store/card/card-types';
import { CardList } from '../../../game/store/state/card-list';
import {CONFIRMATION_PROMPT, DISCARD_ALL_ENERGY_FROM_POKEMON, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lanturn extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Chinchou';
  public cardType: CardType[] = [L];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Energy Grounding',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your opponent\'s turn, when any of your Pokémon is Knocked Out by your opponent\'s attacks, you may use this power. Choose a basic Energy card discarded from the Knocked Out Pokémon and attach it to Lanturn. You can\'t use more than 1 Energy Grounding Poké-Power each turn.'
  }];

  public attacks = [{
    name: 'Lightning Strike',
    cost: [L, L, C],
    damage: 50,
    text: 'You may discard all [L] Energy attached to Lanturn. If you do, this attack\'s base damage is 90 instead of 50.'
  }];

  public set: string = 'HL';
  public setNumber: string = '38';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lanturn';
  public fullName: string = 'Lanturn HL';

  public readonly ENERGY_GROUNDING_MARKER = 'ENERGY_GROUNDING_MARKER';
  public usedLightningStrike = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Grounding Ability
    if (effect instanceof KnockOutEffect && effect.target !== undefined) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      // Only trigger if Knock Out is from opponent's attack
      if (state.players[state.activePlayer] !== opponent) {
        return state;
      }
      // Check if this Lanturn is in play
      let foundLanturn: any = null;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this && cardList.cards.length > 0) {
          foundLanturn = cardList;
        }
      });
      if (!foundLanturn) {
        return state;
      }
      // Check if there is a basic Energy in the knocked out Pokémon
      const basicEnergies = effect.target.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC);
      if (basicEnergies.length === 0) {
        return state;
      }
      // Prompt to move 1 basic Energy to this Pokémon
      const basicEnergiesList = new CardList();
      basicEnergiesList.cards = basicEnergies;
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        basicEnergiesList,
        {},
        { min: 0, max: 1, allowCancel: false }
      ), cards => {
        if (!cards || cards.length === 0) {
          return;
        }
        for (const card of cards) {
          MOVE_CARDS(store, state, effect.target, foundLanturn, { cards: [card], sourceCard: this });
        }
      });
      return state;
    }

    // Lightning Strike attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) {
          DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
          effect.damage = 90;
        }
      }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
    }

    return state;
  }
}
