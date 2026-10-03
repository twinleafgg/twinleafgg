import { ChooseCardsPrompt, EnergyCard, GameMessage, State, StoreLike } from '../../game';
import { CardTag, CardType, Stage, SuperType } from '../../game/store/card/card-types';
import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Effect } from '../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../game/store/prefabs/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class FolkloresLucarioex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [M];
  public hp: number = 100;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Forge',
      cost: [C],
      damage: 0,
      text: "Attach 1 [F] Energy or 1 [M] Energy from your hand to Folklore's Lucario ex.",
    },
    {
      name: 'Linear Attack',
      cost: [F, C],
      damage: 0,
      text: "Does 30 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Extra Claws',
      cost: [M, C, C],
      damage: 50,
      damageCalculation: '+',
      text: 'If the Defending Pokémon is a Pokémon-ex, this attack does 20 more damage.',
    },
  ];

  public set: string = 'GBM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = "Folklore's Lucario ex";
  public fullName: string = "Folklore's Lucario ex GBM";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.hand.cards.forEach((c, i) => {
        if (!(c instanceof EnergyCard)) blocked.push(i);
        else if (!c.provides.includes(CardType.FIGHTING) && !c.provides.includes(CardType.METAL))
          blocked.push(i);
      });
      const hasFightingOrMetalEnergyInHand = player.hand.cards.some(
        (c) =>
          c instanceof EnergyCard &&
          (c.provides.includes(CardType.FIGHTING) || c.provides.includes(CardType.METAL)),
      );
      if (!hasFightingOrMetalEnergyInHand) {
        return state;
      }
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.hand,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.active, { cards: [cards[0]], sourceCard: this });
          }
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    if (WAS_ATTACK_USED(effect, 2, this)) {
      if (effect.opponent.active.getPokemonCard()?.hasTag(CardTag.POKEMON_ex)) {
        effect.damage += 20;
      }
    }

    return state;
  }
}
