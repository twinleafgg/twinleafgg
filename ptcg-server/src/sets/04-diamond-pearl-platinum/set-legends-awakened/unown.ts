import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { SuperType } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PowerType } from '../../../game';
import { SelectPrompt } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED } from '../../../game/store/prefabs/prefabs';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER_AT_END_OF_TURN } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { USE_ABILITY_ONCE_PER_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { WITH_PROMPT_CONTROLLER } from '../../../game/store/prefabs/trainer-prefabs';

export class Unown extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public powers = [{
    // ?
    name: '?',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), if Unown ? is on your Bench, you may choose a Pokémon in your hand and put it face down. Your opponent guesses a type of that Pokémon. Reveal that card. If your opponent guessed wrong, draw a card. Then, put that card back into your hand.'
  }];

  public attacks = [{
    // Hidden Power
    name: 'Hidden Power',
    cost: [],
    damage: 0,
    text: 'Discard up to 2 cards from your hand. For each card you discarded, draw a card.'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Unown [?]';
  public fullName: string = 'Unown [?] LA';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // ?
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      const onBench = player.bench.some(b => b.getPokemonCard() === this);
      if (!onBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const pokemonInHand = player.hand.cards.filter(c => c instanceof PokemonCard);
      if (pokemonInHand.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const chosen = selected[0] as PokemonCard;
        const options = [
          { message: 'Grass', type: G },
          { message: 'Fire', type: R },
          { message: 'Water', type: W },
          { message: 'Lightning', type: L },
          { message: 'Psychic', type: P },
          { message: 'Fighting', type: F },
          { message: 'Darkness', type: D },
          { message: 'Metal', type: M },
          { message: 'Colorless', type: C },
        ];
        WITH_PROMPT_CONTROLLER(store, state, opponent.id, s => {
          return store.prompt(s, new SelectPrompt(
            opponent.id,
            GameMessage.CHOOSE_OPTION,
            options.map(o => o.message),
            { allowCancel: false }
          ), choice => {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, [chosen]);
            const guessed = options[choice].type;
            if (!chosen.cardType.includes(guessed)) {
              DRAW_CARDS(store, state, player, 1);
            }
          });
        });
      });
    }

    // Hidden Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.hand.cards.length === 0) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: true, min: 0, max: 2 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        DRAW_CARDS(store, state, player, cards.length);
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
