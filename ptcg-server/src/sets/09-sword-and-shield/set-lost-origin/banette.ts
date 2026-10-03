import { PokemonCard, Stage, CardType, PowerType, State, StoreLike, PlayerType, Card, GameError, GameMessage, TrainerCard, TrainerType, ChooseCardsPrompt, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { DiscardToHandEffect } from '../../../game/store/effects/play-card-effects';
import { WAS_POWER_USED, MOVE_CARDS, MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';

export class Banette extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Shuppet';

  public regulationMark = 'F';

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 100;

  public weakness = [{ type: CardType.DARK }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Puppet Offering',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may put a Supporter card from your discard pile into your hand. If you do, put this Pokémon in the Lost Zone. (Discard all attached cards.)'
  }];

  public attacks = [
    {
      name: 'Spooky Shot',
      cost: [CardType.PSYCHIC, CardType.PSYCHIC],
      damage: 50,
      text: ''
    }
  ];

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '73';

  public name: string = 'Banette';

  public fullName: string = 'Banette LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasSupporter = player.discard.cards.some(c => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
      });

      if (!hasSupporter) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        return state;
      }

      let cards: Card[] = [];
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];
        MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });

      });

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
            pokemonDestination: player.lostzone,
            attachedDestination: player.discard,
            sourceCard: this,
          });
        }
      });
    }
    return state;
  }
}