import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, StateUtils, TrainerCard, ChooseCardsPrompt, GameMessage, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { CAN_PLAY_SUPPORTER_CARD } from '../../../game/store/prefabs/trainer-prefabs';
import { POKEPOWER_TYPES } from '../../../game/store/prefabs/ability-lock';
import { OPPONENT_POKEMON_HAVE_NO_ABILITIES } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Gardevoir extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Kirlia';
  public cardType: CardType[] = [P];
  public hp: number = 110;
  public weakness = [{ type: P, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Telepass',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your opponent\'s discard pile for a Supporter card and use the effect of that card as the effect of this power. (The Supporter card remains in your opponent\'s discard pile.) You can\'t use more than 1 Telepass Poké-Power each turn. This power can\'t be used if Gardevoir is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Psychic Lock',
    cost: [P, C, C],
    damage: 60,
    text: 'During your opponent\'s next turn, your opponent can\'t use any Poké-Powers on his or her Pokémon.'
  }];

  public set: string = 'SW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Gardevoir';
  public fullName: string = 'Gardevoir SW';

  public readonly TELEPASS_MARKER = 'TELEPASS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Telepass
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supportersInDiscard = opponent.discard.cards.filter(card => {
        return card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER;
      });

      if (!supportersInDiscard || supportersInDiscard.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (HAS_MARKER(this.TELEPASS_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      ADD_MARKER(this.TELEPASS_MARKER, player, this);
      ABILITY_USED(player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
        opponent.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        const trainerCard = cards[0] as TrainerCard;
        if (!CAN_PLAY_SUPPORTER_CARD(store, state, player, trainerCard, true)) {
          return state;
        }
        return state;
      });
    }
    // Psychic Lock
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return OPPONENT_POKEMON_HAVE_NO_ABILITIES(store, state, effect, this, {
        powerTypes: POKEPOWER_TYPES,
        mode: 'block',
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.TELEPASS_MARKER, this);

    return state;
  }
}
