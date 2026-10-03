import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import {ABILITY_USED, ADD_MARKER, DRAW_CARDS, HAS_MARKER, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PowerType, StoreLike, State, GameError, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';

export class Ninetales extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Vulpix';
  public cardType: CardType[] = [R];
  public hp: number = 90;
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Roast Reveal',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard a [R] Energy card from your hand. If you do, draw 3 cards. This power can\'t be used if Ninetales is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Will-o\'-the-wisp',
      cost: [R, R, C],
      damage: 60,
      text: ''
    }
  ];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Ninetales';
  public fullName: string = 'Ninetales HS';

  public readonly ROAST_REVEAL_MARKER = 'ROAST_REVEAL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Energy Draw
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some(c => {
        return c instanceof EnergyCard && c.name === 'Fire Energy';
      });

      // One per turn only
      if (HAS_MARKER(this.ROAST_REVEAL_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      // Cannot use if affected by special conditions
      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      // Cannot use if there is no energy in hand
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, name: 'Fire Energy' },
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        DRAW_CARDS(store, state, player, 3);
      });

      ADD_MARKER(this.ROAST_REVEAL_MARKER, player, this);
      ABILITY_USED(player, this);

      return state;
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      REMOVE_MARKER(this.ROAST_REVEAL_MARKER, player, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ROAST_REVEAL_MARKER, this);

    return state;
  }
}

