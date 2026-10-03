import { CardType, PokemonCard,
  Stage,
  PowerType,
  StoreLike,
  State,
  GameMessage,
  StateUtils,
  PlayerType,
  SuperType,
  GameError,
  PokemonCardList,
  SlotType,
  ChoosePokemonPrompt,
  ChooseCardsPrompt,
  EnergyType,
  CardTag, } from '../../../game';
import {
  CheckPokemonAttacksEffect,
  CheckPokemonPowersEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED,
  BLOCK_EFFECT_IF_MARKER,
  ADD_MARKER,
  ABILITY_USED,
  REMOVE_MARKER_AT_END_OF_TURN,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  DISCARD_TOP_X_OF_OPPONENTS_DECK,
  AFTER_ATTACK,
  MOVE_CARD_TO,
  THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RegigigasLVX extends PokemonCard {
  public stage = Stage.LV_X;
  public evolvesFrom = 'Regigigas';
  protected _tags = [CardTag.POKEMON_LV_X];
  public cardType: CardType[] = [C];
  public hp = 150;
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Sacrifice',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), you may choose 1 of your Pokémon in play and that Pokémon is Knocked Out. Then, search your discard pile for up to 2 basic Energy cards, attach them to Regigigas, and remove 8 damage counters from Regigigas. This power can't be used if Regigigas is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Giga Blaster',
      cost: [W, F, M, C],
      damage: 100,
      text: "Discard the top card from your opponent's deck. Then, choose 1 card from your opponent's hand without looking and discard it. Regigigas can't use Giga Blaster during your next turn.",
    },
  ];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '100';
  public name: string = 'Regigigas';
  public fullName: string = 'Regigigas Lv. X SF';

  public readonly SACRIFICE_MARKER = 'SACRIFICE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-ex-deoxys/camerupt.ts (Back Burner), set-triumphant/electrode.ts (Energymite)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_EFFECT_IF_MARKER(this.SACRIFICE_MARKER, player, this);
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      ABILITY_USED(player, this);
      ADD_MARKER(this.SACRIFICE_MARKER, player, this);

      const regigigasCardList = StateUtils.findCardList(state, this) as PokemonCardList;

      // Choose 1 of your Pokémon in play to Knock Out
      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          if (targets.length === 0) {
            return state;
          }

          const chosenCardList = targets[0] as PokemonCardList;

          // Move attached cards (energy, tools) to discard before KO
          const pokemons = chosenCardList.getPokemons();
          const attachedCards = chosenCardList.cards.filter(
            (c) => !pokemons.includes(c as PokemonCard),
          );
          const tools = chosenCardList.tools.slice();

          attachedCards.forEach((c) => MOVE_CARDS(store, state, chosenCardList, player.discard, { cards: [c], sourceCard: this }));
          tools.forEach((c) => MOVE_CARDS(store, state, chosenCardList, player.discard, { cards: [c], sourceCard: this }));

          // Mark chosen Pokémon for KO
          chosenCardList.damage += 999;

          // Search discard pile for up to 2 basic Energy cards, attach them to Regigigas
          const hasBasicEnergy = player.discard.cards.some(
            (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
          );

          if (!hasBasicEnergy) {
            // Still remove 8 damage counters from Regigigas
            const healEffect = new HealEffect(player, regigigasCardList, 80);
            store.reduceEffect(state, healEffect);
            return state;
          }

          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.ATTACH_ENERGY_CARDS,
              player.discard,
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
              { min: 0, max: 2, allowCancel: false },
            ),
            (cards) => {
              cards = cards || [];
              cards.forEach((card) => {
                MOVE_CARDS(store, state, player.discard, regigigasCardList, { cards: [card], sourceCard: this });
              });

              // Remove 8 damage counters from Regigigas
              const healEffect = new HealEffect(player, regigigasCardList, 80);
              store.reduceEffect(state, healEffect);
            },
          );
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.SACRIFICE_MARKER, this);

    // Giga Blaster
    if (AFTER_ATTACK(effect, 0, this)) {
      DISCARD_TOP_X_OF_OPPONENTS_DECK(store, state, effect.player, 1, this, this.attacks[0]);
      const opponent = effect.opponent;

      if (opponent.hand.cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const randomCard = opponent.hand.cards[randomIndex];
        MOVE_CARD_TO(state, randomCard, opponent.discard);
      }

      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[0]);
    }

    //Lv. X Stuff
    // making sure it gets put on the active pokemon
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Trying to get all of the previous stage's attacks and powers
    if (effect instanceof CheckTableStateEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        return state;
      }

      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
          player.showAllStageAbilities = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }
    }

    if (effect instanceof CheckPokemonAttacksEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        return state;
      }

      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }

      // Add attacks from the previous stage to this one
      for (const evolutionCard of cardList.cards) {
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.attacks.push(...(evolutionCard.attacks || []));
        }
      }
    }

    if (effect instanceof CheckPokemonPowersEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        return state;
      }

      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }

      // Adds the powers from the previous stage
      for (const evolutionCard of cardList.cards) {
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.powers.push(...(evolutionCard.powers || []));
        }
      }
    }

    return state;
  }
}
