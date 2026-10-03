import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  EnergyType,
  CardTag,
  SpecialCondition,
} from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  CardTarget,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  PowerType,
  ShowCardsPrompt,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import {
  AddSpecialConditionsEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import { GreninjaVUNIONTopRight } from './greninja-v-union-tr';
import { GreninjaVUNIONBottomLeft } from './greninja-v-union-bl';
import { GreninjaVUNIONBottomRight } from './greninja-v-union-br';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayItemEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class GreninjaVUNIONTopLeft extends PokemonCard {
  public stage: Stage = Stage.VUNION;
  protected _tags = [CardTag.POKEMON_VUNION];
  public cardType: CardType[] = [W];
  public hp: number = 300;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Greninja V-UNION Assembly',
      text: 'Once per game during your turn, combine 4 different Greninja V-UNION from your discard pile and put them onto your bench.',
      useFromDiscard: true,
      exemptFromAbilityLock: true,
      powerType: PowerType.VUNION_ASSEMBLY,
    },
    {
      name: 'Ninja Body',
      text: 'Whenever your opponent plays an Item card from their hand, prevent all effects of that card done to this Pokémon.',
      powerType: PowerType.ABILITY,
    },
    {
      name: 'Antidote Jutsu',
      text: "This Pokémon can't be Poisoned.",
      powerType: PowerType.ABILITY,
    },
    {
      name: 'Feel the Way',
      text: 'Once during your turn, you may have your opponent reveal their hand.',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
    },
  ];

  public attacks = [
    {
      name: 'Union Gain',
      cost: [C],
      damage: 0,
      text: 'Attach up to 2 [W] Energy cards from your discard pile to this Pokémon.',
    },
    {
      name: 'Aqua Edge',
      cost: [W],
      damage: 130,
      text: '',
    },
    {
      name: 'Twister Shuriken',
      cost: [W, W, C],
      damage: 0,
      text: "This attack does 100 damage to each of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Waterfall Bind',
      cost: [W, W, C],
      damage: 180,
      text: "During your opponent's next turn, the Defending Pokémon can't retreat.",
    },
  ];

  public regulationMark = 'E';
  public set: string = 'SWSH';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '155';
  public name: string = 'Greninja V-UNION';
  public fullName: string = 'Greninja V-UNION (Top Left) SWSH';

  public readonly FEEL_THE_WAY_MARKER = 'FEEL_THE_WAY_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // assemblin the v-union
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.assembledVUNIONs.includes(this.name)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let topLeftPiece = false;
      let topRightPiece = false;
      let bottomLeftPiece = false;
      let bottomRightPiece = false;
      player.discard.cards.forEach((card) => {
        if (card instanceof GreninjaVUNIONTopLeft) {
          topLeftPiece = true;
        }
        if (card instanceof GreninjaVUNIONTopRight) {
          topRightPiece = true;
        }
        if (card instanceof GreninjaVUNIONBottomLeft) {
          bottomLeftPiece = true;
        }
        if (card instanceof GreninjaVUNIONBottomRight) {
          bottomRightPiece = true;
        }
      });

      if (topLeftPiece && topRightPiece && bottomLeftPiece && bottomRightPiece) {
        if (slots.length > 0) {
          player.discard.cards.forEach((card) => {
            if (card instanceof GreninjaVUNIONTopRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof GreninjaVUNIONBottomLeft) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof GreninjaVUNIONBottomRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          // gotta make sure the actual mon ends up on top
          player.discard.cards.forEach((card) => {
            if (card instanceof GreninjaVUNIONTopLeft) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.assembledVUNIONs.push(this.name);
          slots[0].pokemonPlayedTurn = state.turn;
        }
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    // Ninja Body
    if (effect instanceof PlayItemEffect && effect.target && effect.target.cards.includes(this)) {
      /*const player = StateUtils.findOwner(state, effect.target);

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }*/
      // effect.preventDefault = true;
    }

    // Antidote Jutsu
    if (
      effect instanceof AddSpecialConditionsEffect &&
      effect.target.cards.includes(this) &&
      effect.specialConditions.includes(SpecialCondition.POISONED)
    ) {
      effect.preventDefault = true;
    }

    // Feel the Way
    if (effect instanceof PowerEffect && effect.power === this.powers[3]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (this.marker.hasMarker(this.FEEL_THE_WAY_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (opponent.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, opponent.hand.cards),
        () => {},
      );

      this.marker.addMarker(this.FEEL_THE_WAY_MARKER, this);
      player.marker.addMarker(this.FEEL_THE_WAY_MARKER, this);
    }

    // Union Gain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let watersInDiscard = 0;
      // checking for energies in the discard
      player.discard.cards.forEach((card) => {
        if (
          card instanceof EnergyCard &&
          card.energyType === EnergyType.BASIC &&
          card.name === 'Water Energy'
        ) {
          watersInDiscard++;
        }
      });

      if (watersInDiscard > 0) {
        const blocked: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
          if (card !== this) {
            blocked.push(target);
          }
        });

        state = store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_TO_BENCH,
            player.discard,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH, SlotType.ACTIVE],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
            { allowCancel: false, min: 0, max: Math.min(2, watersInDiscard), blockedTo: blocked },
          ),
          (transfers) => {
            transfers = transfers || [];
            // cancelled by user
            if (transfers.length === 0) {
              return;
            }
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
            }
          },
        );
      }
    }

    // Twister Shuriken
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const opponent = effect.opponent;

      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (target.slot === SlotType.BENCH) {
          const damage = new PutDamageEffect(effect, 100);
          damage.target = cardList;
          store.reduceEffect(state, damage);
        }
      });
    }

    // Waterfall Bind
    if (WAS_ATTACK_USED(effect, 3, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.FEEL_THE_WAY_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.FEEL_THE_WAY_MARKER, this);
      this.marker.removeMarker(this.FEEL_THE_WAY_MARKER, this);
    }

    return state;
  }
}
