import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  EnergyCard,
  GameMessage,
  ChooseCardsPrompt,
  CardList,
  PokemonCardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Eelektross extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Eelektrik';
  public cardType: CardType[] = [L];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Crush and Burn',
    cost: [L, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Discard as many Energy attached to your Pok\u00e9mon as you like. This attack does 30 damage times the number of Energy cards you discarded.'
  }, {
    name: 'Thunder Tempest',
    cost: [L, C, C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Flip 4 coins. This attack does 50 damage times the number of heads.'
  }];

  public set: string = 'PLB';
  public setNumber: string = '33';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Eelektross';
  public fullName: string = 'Eelektross PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Collect all energy cards from all of player's Pokemon
      const energyCards: { card: EnergyCard; source: PokemonCardList }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        cardList.cards.forEach((c) => {
          if (c.superType === SuperType.ENERGY) {
            energyCards.push({ card: c as EnergyCard, source: cardList });
          }
        });
      });

      if (energyCards.length === 0) {
        effect.damage = 0;
        return state;
      }

      // Create a temporary CardList to pick from
      const tempList = new CardList();
      energyCards.forEach((e) => tempList.cards.push(e.card));

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          tempList,
          {},
          { min: 0, max: energyCards.length, allowCancel: false },
        ),
        (selected) => {
          if (selected && selected.length > 0) {
            selected.forEach((card) => {
              const entry = energyCards.find((e) => e.card === card);
              if (entry) {
                MOVE_CARDS(store, state, entry.source, player.discard, { cards: [card], sourceCard: this });
              }
            });
            effect.damage = 30 * selected.length;
          } else {
            effect.damage = 0;
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 4, (results) => {
        const heads = results.filter((r) => r).length;
        effect.damage = 50 * heads;
      });
    }

    return state;
  }
}
