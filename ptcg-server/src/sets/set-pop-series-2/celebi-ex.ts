import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  StateUtils,
  CardList,
  ChooseCardsPrompt,
  GameMessage,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { ABILITY_USED, CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARD_TO, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import { PowerEffect } from '../../game/store/effects/game-effects';

export class Celebiex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [
    {
      name: 'Time Reversal',
      powerType: PowerType.POKEPOWER,
      text: 'Once during your turn, when you put Celebi ex from your hand onto your Bench, you may search your discard pile for a card, show it to your opponent, and put it on top of your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Psychic Shield',
      cost: [P, C],
      damage: 30,
      text: "Prevent all effects of attacks, including damage, done to Celebi ex by your opponent's Pokémon-ex during your opponent's next turn.",
    },
  ];

  public set: string = 'P2';
  public setNumber: string = '17';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Celebi ex';
  public fullName: string = 'Celebi ex P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.discard.cards.length === 0) {
        return state;
      }

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      CONFIRMATION_PROMPT(
        store,
        state,
        player,
        (wantToUse) => {
          if (wantToUse) {
            const powerEffect = new PowerEffect(player, this.powers[0], this);
            store.reduceEffect(state, powerEffect);

            const deckTop = new CardList();
            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DECK,
                player.discard,
                {},
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                if (selected.length === 0) return;

                selected.forEach((card) => {
                  MOVE_CARD_TO(state, card, deckTop);
                });
                deckTop.moveToTopOfDestination(player.deck);
                SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);

                ABILITY_USED(player, this);
              },
            );
          }
        },
        GameMessage.WANT_TO_USE_ABILITY,
      );
    }

    // Psychic Shield
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const options = { sourceTags: [CardTag.POKEMON_ex] };
      PREVENT_DAMAGE(store, state, effect, this, options);
      PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this, options);
    }

    return state;
  }
}
