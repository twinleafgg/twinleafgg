import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { GameMessage, EnergyCard, PlayerType, SlotType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';

export class Manectric2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Electrike';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Energy Assist',
      cost: [L],
      damage: 0,
      text: 'Attach 2 basic Energy cards from your discard pile to 1 of your Benched Pokémon.'
    },
    {
      name: 'Quick Attack',
      cost: [L, C],
      damage: 30,
      damageCalculation: '+',
      text: 'Flip a coin. If heads, this attack does 20 more damage.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '44';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Manectric';
  public fullName: string = 'Manectric DRX 44';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Assist - attach 2 basic Energy from discard to 1 Benched Pokemon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }

      const basicEnergyInDiscard = player.discard.cards.filter(c =>
        c.superType === SuperType.ENERGY && (c as EnergyCard).energyType === EnergyType.BASIC
      );

      if (basicEnergyInDiscard.length === 0) {
        return state;
      }

      const count = Math.min(2, basicEnergyInDiscard.length);

      // Choose a Benched Pokemon first
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return state;
        }

        const target = targets[0];

        // Then choose up to 2 basic Energy from discard
        const blocked: number[] = [];
        player.discard.cards.forEach((card, index) => {
          if (card.superType !== SuperType.ENERGY || (card as EnergyCard).energyType !== EnergyType.BASIC) {
            blocked.push(index);
          }
        });

        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.discard,
          { superType: SuperType.ENERGY },
          { min: count, max: count, allowCancel: false, blocked }
        ), selected => {
          const cards = selected || [];
          cards.forEach(card => {
            MOVE_CARDS(store, state, player.discard, target, { cards: [card], sourceCard: this });
          });
        });
      });
    }

    // Quick Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}
