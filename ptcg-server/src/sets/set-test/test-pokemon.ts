import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect, SpecialCondition } from '../../game/store/card/card-types';
import { StoreLike, State, PowerType, PlayerType, StateUtils, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, ChoosePokemonPrompt, SlotType } from '../../game';
import { Effect, EffectOfAbilityEffect, MoveCardsEffect, PowerEffect } from '../../game/store/effects/game-effects';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class TestPokemon extends PokemonCard {

  public regulationMark = 'G';
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 1000;
  public weakness = [{ type: D }];
  public retreat = [];

  public powers = [
    {
      name: 'Have Your Cake',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Add as many cards as you want from your deck to your hand.'
    },
    {
      name: 'Extremely Cursed Blast',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, both players Active Pokemon are Knocked Out.'
    },
    {
      name: 'Draw 1 From Top',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Draw 1 card from the top of your deck.'
    },
    {
      name: 'Draw 1 From Bottom',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Draw 1 card from the bottom of your deck.'
    },
    {
      name: 'Status Chaos',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Your opponent\'s Active Pokémon is now Poisoned, Asleep, Paralyzed, and Confused.'
    }
  ];

  public attacks = [
    {
      name: 'A Bit Much',
      cost: [],
      damage: 100,
      text: ''
    },
  ];

  public set: string = 'TEST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Test Pokemon';
  public fullName: string = 'Test Pokemon TEST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof MoveCardsEffect && effect.cards?.includes(this) && effect.sourceCard?.name === 'Roxie') {
      const playerPokemon = StateUtils.findOwner(state, effect.source);
      const opponentPokemon = StateUtils.getOpponent(state, playerPokemon);

      opponentPokemon.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.getPokemonCard() === opponentPokemon.active.getPokemonCard()) {
          cardList.damage += 100;
        }
      });
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 0, max: 60, allowCancel: false }
      ), cards => {
        MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        state = store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });

        return state;
      });
    }

    if (WAS_POWER_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const opponentActive = opponent.active.getPokemonCard();
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.damage += 999;
        }
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.getPokemonCard() === opponentActive) {
          const damageEffect = new EffectOfAbilityEffect(player, this.powers[0], this, cardList);
          store.reduceEffect(state, damageEffect);
          if (damageEffect.target) {
            damageEffect.target.damage += 999;
          }
        }
      });
    }

    if (effect instanceof PowerEffect && effect.power === this.powers[2]) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { cards: [player.deck.cards[0]], sourceCard: this });
    }

    if (effect instanceof PowerEffect && effect.power === this.powers[3]) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { cards: [player.deck.cards[player.deck.cards.length - 1]], sourceCard: this });
    }

    if (effect instanceof PowerEffect && effect.power === this.powers[4]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active.getPokemonCard();

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.getPokemonCard() === opponentActive) {
          // Apply all four status conditions
          cardList.specialConditions = [
            ...cardList.specialConditions,
            SpecialCondition.POISONED,
            SpecialCondition.ASLEEP,
            SpecialCondition.PARALYZED,
            SpecialCondition.CONFUSED,
            SpecialCondition.BURNED
          ];

          // Remove duplicates
          cardList.specialConditions = [...new Set(cardList.specialConditions)];
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const max = Math.min(2);
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: max, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        targets.forEach(target => {

          if (target.isOpponentActive(state)) {
            const damageEffect = new PutDamageEffect(effect, 100);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }

          if (target.isOpponentBench(state)) {
            const damageEffect = new PutDamageEffect(effect, 50);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }

        });
        return state;
      });
    }

    return state;
  }
}