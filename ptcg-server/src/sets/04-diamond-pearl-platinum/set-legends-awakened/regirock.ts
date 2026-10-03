import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt, EnergyCard, GameError, GameMessage, PowerType, StateUtils } from '../../../game';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED, ADD_MARKER, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';

export class Regirock extends PokemonCard {

  public stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp = 90;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Regi Cycle',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if you have a [F] Energy card in your discard pile, you may discard 2 cards from your hand. Then, attach a [F] Energy card from your discard pile to Regirock. This power can\'t be used if Regirock is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Stone Edge',
      cost: [F, F, C],
      damage: 40,
      damageCalculation: '+',
      text: 'Flip a coin. If heads, this attack does 40 damage plus 30 more damage.'
    }
  ];

  public set: string = 'LA';
  public setNumber: string = '38';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Regirock';
  public fullName: string = 'Regirock LA';

  public readonly REGI_CYCLE_MARKER = 'REGI_CYCLE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.REGI_CYCLE_MARKER, effect.player, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.REGI_CYCLE_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.REGI_CYCLE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.hand.cards.length < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard && c.name == 'Fighting Energy';
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: true, min: 2, max: 2 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        ADD_MARKER(this.REGI_CYCLE_MARKER, player, this);
        ABILITY_USED(player, this);

        const cardList = StateUtils.findCardList(state, this);
        const energyCard = player.discard.cards.find(c => c instanceof EnergyCard && c.name === 'Fighting Energy');
        if (energyCard) {
          MOVE_CARDS(store, state, player.discard, cardList, { cards: [energyCard], sourceCard: this });
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }
    return state;
  }
}