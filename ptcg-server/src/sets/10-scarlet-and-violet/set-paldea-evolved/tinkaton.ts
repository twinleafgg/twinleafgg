import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, GameError, GameMessage, PlayerType, ChooseCardsPrompt, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Tinkaton extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 140;
  public weakness = [{ type: CardType.METAL }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];
  public evolvesFrom: string = 'Tinkatuff';

  public powers = [{
    name: 'Gather Materials',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'You must discard a card from your hand in order to use this Ability. Once during your turn, you may draw 3 cards.'
  }];

  public attacks = [{
    name: 'Special Hammer',
    cost: [CardType.PSYCHIC, CardType.COLORLESS],
    damage: 90,
    damageCalculation: '+',
    text: 'If this Pokemon has any Special Energy attached, this attack does 90 more damage.'
  }];

  public regulationMark: string = 'G';
  public set: string = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Tinkaton';
  public fullName: string = 'Tinkaton PAL';

  public readonly GATHER_MATERIALS_MARKER = 'GATHER_MATERIALS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.GATHER_MATERIALS_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.GATHER_MATERIALS_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        player.marker.addMarker(this.GATHER_MATERIALS_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      });

      return state;
    }

    if (effect instanceof AttackEffect && effect.attack == this.attacks[0]) {
      const player = effect.player;
      const pokemon = player.active;

      let specialEnergyCount = 0;
      pokemon.cards.forEach(c => {
        if (c instanceof EnergyCard) {
          if (c.energyType === EnergyType.SPECIAL) {
            specialEnergyCount++;
          }
        }
      });

      if (specialEnergyCount > 0) {
        effect.damage += 90;
      }

      return state;
    }
    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.GATHER_MATERIALS_MARKER, this);
    }

    return state;
  }

}