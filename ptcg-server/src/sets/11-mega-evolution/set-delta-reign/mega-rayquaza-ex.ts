import {
  CardList,
  CardType,
  ChooseCardsPrompt,
  ConfirmPrompt,
  EnergyCard,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  Stage,
  State,
  StoreLike,
  SuperType,
} from '../../../game';
import { CardTag } from '../../../game/store/card/card-types';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {
  AttachEnergyEffect,
  PlayPokemonEffect,
} from '../../../game/store/effects/play-card-effects';
import {
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class MegaRayquazaex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 280;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers = [
    {
      name: "Champion's Roar",
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may use this Ability. Look at the top 4 cards of your deck and attach a Basic Energy you find there to this Pokémon. Shuffle the remaining cards and put them on the bottom of your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Storm Emeralda',
      cost: [R, L, C],
      damage: 50,
      damageCalculation: 'x',
      text: 'This attack does 50 damage times the number of [R] and [L] Energy attached to all of your Pokémon in play.',
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'M6';
  public setNumber: string = '58';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Rayquaza ex';
  public fullName: string = 'Mega Rayquaza ex M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-rebel-clash/eldegoss-v.ts (PlayPokemonEffect bench), set-phantasmal-flames/grimsleys-gambit.ts (deck bottom)
    if (
      effect instanceof PlayPokemonEffect &&
      effect.pokemonCard === this &&
      effect.slot === SlotType.BENCH &&
      effect.target.cards.length === 0
    ) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (!wantToUse) {
            return;
          }

          const topCards = new CardList();
          const count = Math.min(4, player.deck.cards.length);
          MOVE_CARDS(store, state, player.deck, topCards, { count: count, sourceCard: this });

          SHOW_CARDS_TO_PLAYER(store, state, player, topCards.cards);

          const hasBasicEnergy = topCards.cards.some(
            (c) => c instanceof EnergyCard && c.energyType === EnergyType.BASIC,
          );

          if (!hasBasicEnergy) {
            MOVE_CARDS(store, state, topCards, player.deck, { toBottom: true });
            return;
          }

          store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_ATTACH,
              topCards,
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
              { allowCancel: false, min: 0, max: 1 },
            ),
            (cards) => {
              cards = cards || [];
              if (cards.length > 0) {
                const energyCard = cards[0] as EnergyCard;
                MOVE_CARDS(store, state, topCards, effect.target, { cards: [energyCard], sourceCard: this });
                store.reduceEffect(
                  state,
                  new AttachEnergyEffect(player, energyCard, effect.target),
                );
              }

              MOVE_CARDS(store, state, topCards, player.deck, { toBottom: true });
            },
          );
        },
      );
    }

    // Ref: set-black-and-white/mandibuzz.ts (Dark Pulse energy count)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let energyCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const checkEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkEnergy);
        energyCount += checkEnergy.energyMap.reduce((sum, em) => {
          return (
            sum +
            em.provides.filter(
              (c) => c === CardType.FIRE || c === CardType.LIGHTNING || c === CardType.ANY,
            ).length
          );
        }, 0);
      });

      (effect as AttackEffect).damage = 50 * energyCount;
    }

    return state;
  }
}
