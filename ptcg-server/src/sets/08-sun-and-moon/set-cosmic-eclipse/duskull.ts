import { Card, CardTarget, CardType, ChooseCardsPrompt, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PokemonCard, PokemonCardList, Power, PowerType, ShuffleDeckPrompt, SlotType, State, StoreLike, SuperType } from '../../../game';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';

import { MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Duskull extends PokemonCard {

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp = 40;

  public weakness = [{ type: CardType.DARK }];

  public resistance = [{ type: CardType.FIGHTING, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers: Power[] = [{
    name: 'Spiritborne Evolution',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may discard 3 cards from your hand. If you do, search your deck for a card that evolves from this Pokémon and put it onto this Pokémon to evolve it. Then, shuffle your deck.'
  }];

  public attacks = [
    {
      name: 'Ominous Eyes',
      cost: [CardType.PSYCHIC],
      damage: 0,
      text: 'Put 2 damage counters on 1 of your opponent\'s Pokémon.'
    }
  ];

  public set: string = 'CEC';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '83';

  public name: string = 'Duskull';

  public fullName: string = 'Duskull CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.hand.cards.length < 3) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: false, min: 3, max: 3 }
      ), cards => {
        cards = cards || [];

        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this, sourceEffect: this.powers[0] });

        // Blocking pokemon cards, that cannot be valid evolutions
        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (card instanceof PokemonCard && card.evolvesFrom !== 'Duskull') {
            blocked.push(index);
          }
        });

        let selectedCards: Card[] = [];
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_EVOLVE,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: true, blocked }
        ), selected => {
          selectedCards = selected || [];

          if (selectedCards.length === 0) {
            return state;
          }

          const evolution = selectedCards[0] as PokemonCard;

          const blocked2: CardTarget[] = [];
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
            if (card.name !== 'Duskull') {
              blocked2.push(target);
            }
          });

          let targets: PokemonCardList[] = [];
          store.prompt(state, new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { allowCancel: false, blocked: blocked2 }
          ), selection => {
            targets = selection || [];

            // Evolve Pokemon
            MOVE_CARDS(store, state, player.deck, targets[0], { cards: [evolution], sourceCard: this, sourceEffect: this.powers[0] });
            targets[0].clearEffects();
            targets[0].pokemonPlayedTurn = state.turn;

            return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
              player.deck.applyOrder(order);
            });
          });
        });
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        targets.forEach(target => {
          const damageEffect = new PutCountersEffect(effect, 20);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        });
        return state;
      });
    }
    return state;
  }
}
