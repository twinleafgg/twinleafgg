import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import {
  PowerType, StoreLike, State, StateUtils,
  GameMessage, ConfirmPrompt, ChooseCardsPrompt, EnergyCard, GameError,
  PokemonCardList,
  Card
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_POKEPOWER_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PowerEffect } from '../../../game/store/effects/game-effects';

export class Pachirisu extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Self-Generation',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Pachirisu from your hand onto your Bench, you may attach up to 2 [L] Energy cards from your hand to Pachirisu.'
  }];

  public attacks = [
    {
      name: 'Shocking Bolt',
      cost: [L, L],
      damage: 50,
      text: 'Put all Energy cards attached to Pachirisu in the Lost Zone.'
    }
  ];

  public set: string = 'CL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Pachirisu';
  public fullName: string = 'Pachirisu CL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if ((effect instanceof PlayPokemonEffect) && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }
      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const powerEffect = new PowerEffect(player, this.powers[0], this);
          store.reduceEffect(state, powerEffect);

          const hasEnergyInHand = player.hand.cards.some(c => {
            return c.superType === SuperType.ENERGY
              && c.energyType === EnergyType.BASIC
              && (c as EnergyCard).provides.includes(CardType.LIGHTNING);
          });
          if (!hasEnergyInHand) {
            throw new GameError(GameMessage.CANNOT_USE_POWER);
          }

          const cardList = StateUtils.findCardList(state, this);
          if (cardList === undefined) {
            return state;
          }

          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_ATTACH,
            player.hand,
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
            { min: 0, max: 2, allowCancel: false }
          ), cards => {
            cards = cards || [];
            if (cards.length > 0) {
              MOVE_CARDS(store, state, player.hand, cardList, { cards, sourceCard: this, sourceEffect: this.powers[0] });
            }
          });
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList))
        throw new GameError(GameMessage.INVALID_TARGET);

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      const cards: Card[] = checkProvidedEnergy.energyMap.map(e => e.card);
      cards.forEach(card => {
        MOVE_CARDS(store, state, cardList, player.lostzone, { cards: [card], sourceCard: this, sourceEffect: this.attacks[0] });
      });
    }
    return state;
  }
}
