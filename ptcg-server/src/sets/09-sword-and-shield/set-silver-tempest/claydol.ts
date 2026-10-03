import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, Stage, EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, PowerType, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {ABILITY_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Claydol extends PokemonCard {

  public regulationMark = 'F';

  public stage = Stage.STAGE_1;

  public evolvesFrom = 'Baltoy';

  public cardType: CardType[] = [F];

  public hp = 110;

  public weakness = [{ type: G }];

  public retreat = [C, C];

  public powers = [{
    name: 'Mystery Charge',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'You can use this Ability only if you have no Supporter cards in your discard pile. Once during your turn, you may attach a [F] Energy card from your discard pile to 1 of your Pokémon.'
  }];

  public attacks = [
    {
      name: 'Spinning Attack',
      cost: [F, C, C],
      damage: 70,
      text: ''
    }
  ];

  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Claydol';
  public fullName: string = 'Claydol SIT';

  public readonly CHARGE_MARKER = 'CHARGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Checking if there are supporters in the discard
      const hasSupporter = player.discard.cards.some(c => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
      });
      if (hasSupporter) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Checking if there's an Basic [F] Energy in the discard
      // Ideally we should check whether there's an Energy card providing [F], but in practice they're the same thing (as of Journey Together)
      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && c.name === 'Fighting Energy';
      });
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Cealgair: idk why this bit is here, I copied it from Naganadel LOT
      const cardList = StateUtils.findCardList(state, this);
      if (cardList === undefined) {
        return state;
      }

      // Putting the "Ability used" marker on 
      ABILITY_USED(player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.discard,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), cards => {
        cards = cards || [];
        if (cards.length > 0) {
          player.marker.addMarker(this.CHARGE_MARKER, this);
          MOVE_CARDS(store, state, player.discard, cardList, { cards: cards, sourceCard: this });
        }
      });
    }
    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.CHARGE_MARKER, this);
    }
    return state;
  }
}