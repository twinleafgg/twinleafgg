import {
  PokemonCard,
  Stage,
  CardType,
  CardTag,
  PowerType,
  StoreLike,
  State,
  ConfirmPrompt,
  GameMessage,
  SuperType,
  StateUtils,
  ChooseCardsPrompt,
  Card,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  DiscardToHandEffect,
  PlayPokemonEffect,
} from '../../../game/store/effects/play-card-effects';
import {
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class DragoniteEX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.COLORLESS];
  public hp: number = 180;
  public weakness = [{ type: CardType.LIGHTNING }];
  public resistance = [{ type: CardType.FIGHTING, value: -20 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];
  protected _tags = [CardTag.POKEMON_EX];

  public powers = [
    {
      name: 'Pull Up',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench, you may put 2 Basic Pokémon (except for Dragonite-EX) from your discard pile into your hand.',
    },
  ];

  public attacks = [
    {
      name: 'Hyper Beam',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 130,
      text: "Discard an Energy attached to your opponent's Active Pokémon.",
    },
  ];

  public set: string = 'EVO';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '72';

  public name: string = 'Dragonite-EX';

  public fullName: string = 'Dragonite EX EVO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      const hasBasicPokemonInDiscard = player.discard.cards.some((c) => {
        return c instanceof PokemonCard && c.stage === Stage.BASIC;
      });
      if (!hasBasicPokemonInDiscard) {
        return state;
      }

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (confirmed) => {
          if (confirmed) {
            const blocked: number[] = [];
            player.bench.forEach((card, index) => {
              if (card instanceof PokemonCard && card.name === 'Dragonite-EX') {
                blocked.push(index);
              }
            });

            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                { superType: SuperType.POKEMON, stage: Stage.BASIC },
                { min: 0, max: 2, allowCancel: false, blocked: blocked },
              ),
              (selected) => {
                if (selected && selected.length > 0) {
                  selected.forEach((card) => {
                    MOVE_CARDS(store, state, player.discard, player.hand, {
                      cards: [card],
                      sourceCard: this,
                      sourceEffect: this.powers[0],
                    });
                  });
                }
                return state;
              },
            );
          }
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Defending Pokemon has no energy cards attached
      if (!opponent.active.energies.cards.some((c) => c.superType === SuperType.ENERGY)) {
        return state;
      }

      let card: Card;
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.active,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          card = selected[0];

          MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [card], sourceCard: this });
          return state;
        },
      );
    }

    return state;
  }
}
