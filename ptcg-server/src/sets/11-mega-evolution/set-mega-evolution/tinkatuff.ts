import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {ABILITY_USED, COIN_FLIP_PROMPT, IS_ABILITY_BLOCKED, JUST_EVOLVED, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Tinkatuff extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Tinkatink';
  public hp: number = 90;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Haphazard Hammer',
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. Flip a coin. If heads, discard an Energy from your opponent\'s Active Pokémon.',
  }];

  public attacks = [{
    name: 'Light Punch',
    cost: [M],
    damage: 30,
    text: ''
  }];

  public regulationMark = 'I';

  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Tinkatuff';
  public fullName: string = 'Tinkatuff MEG';

  private RUSTLING_WIND_MARKER = 'RUSTLING_WIND_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Haphazard Hammer
    if (JUST_EVOLVED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Check if ability was already used this turn
      if (player.marker.hasMarker(this.RUSTLING_WIND_MARKER, this)) {
        return state;
      }
      // Check if opponent's active has energy cards
      const hasEnergy = opponent.active.energies.cards.some(card => card.superType === SuperType.ENERGY);
      if (!hasEnergy) {
        return state;
      }
      // Mark ability as used
      player.marker.addMarker(this.RUSTLING_WIND_MARKER, this);
      // Flip coin
      return COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          // If heads, select and move energy to opponent's discard
          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            opponent.active,
            { superType: SuperType.ENERGY },
            { min: 1, max: 1, allowCancel: false }
          ), selected => {
            if (selected && selected.length > 0) {
              const energyCard = selected[0];
              MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [energyCard], sourceCard: this });
            }
          });
          ABILITY_USED(player, this);
        }
        return state;
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.RUSTLING_WIND_MARKER, this);

    return state;
  }
}