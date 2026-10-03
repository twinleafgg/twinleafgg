import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, StateUtils, GameMessage, PlayerType, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyType, SuperType } from '../../../game/store/card/card-types';
import { CardList } from '../../../game/store/state/card-list';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lanturn extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Chinchou';
  public cardType: CardType[] = [CardType.LIGHTNING];
  public hp: number = 110;
  public weakness = [{ type: CardType.FIGHTING }];
  public resistance = [{ type: CardType.METAL, value: -20 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Energy Grounding',
      powerType: PowerType.ABILITY,
      text: 'When 1 of your Pokémon is Knocked Out by damage from an opponent\'s attack, you may move a basic Energy card from that Pokémon to this Pokémon.'
    }
  ];

  public attacks = [
    {
      name: 'Lightning Strike',
      cost: [CardType.LIGHTNING, CardType.LIGHTNING, CardType.COLORLESS],
      damage: 70,
      damageCalculation: '+',
      text: 'You may discard all [L] Energy from this Pokémon. If you do, this attack does 70 more damage.'
    }
  ];

  public set: string = 'CES';
  public setNumber: string = '50';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lanturn';
  public fullName: string = 'Lanturn CES';

  public readonly ENERGY_GROUNDING_MARKER = 'ENERGY_GROUNDING_MARKER';

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
      const active = player.active;
      // Find all Lightning Energy attached to this Pokémon
      const lightningEnergies = active.cards.filter(c => c.superType === SuperType.ENERGY && (c as EnergyCard).provides.includes(CardType.LIGHTNING));
      if (lightningEnergies.length > 0) {
        const lightningEnergiesList = new CardList();
        lightningEnergiesList.cards = lightningEnergies;
        // Prompt to discard all Lightning Energy for extra damage
        state = store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.WANT_TO_DISCARD_ENERGY,
          lightningEnergiesList,
          {},
          { min: 0, max: lightningEnergies.length, allowCancel: true }
        ), cards => {
          if (cards && cards.length === lightningEnergies.length && cards.length > 0) {
            // Discard all Lightning Energy and do 70 more damage
            for (const card of cards) {
              MOVE_CARDS(store, state, active, player.discard, { cards: [card], sourceCard: this });
            }
            effect.damage += 70;
          }
        });
      }
      return state;
    }

    return state;
  }
}
