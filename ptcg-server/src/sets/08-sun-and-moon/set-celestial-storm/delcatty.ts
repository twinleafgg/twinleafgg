import { CardType, ChooseCardsPrompt, ConfirmPrompt, GameMessage, PokemonCard, PowerType, ShowCardsPrompt, Stage, State, StateUtils, StoreLike, SuperType, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardToHandEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Delcatty extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Skitty';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 90;

  public weakness = [{ type: CardType.FIGHTING }];

  public resistance = [];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Search for Friends',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may put 2 Supporter cards from your discard pile into your hand.'
  }];

  public attacks = [
    {
      name: 'Cat Kick',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 40,
      text: ''
    }
  ];

  public set: string = 'CES';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '121';

  public name: string = 'Delcatty';

  public fullName: string = 'Delcatty CES';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supportersInDiscard = player.discard.cards.filter(c => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER).length;

      if (supportersInDiscard === 0) {
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

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {

          const max = Math.min(supportersInDiscard, 2);

          state = store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
            { min: max, max: max, allowCancel: false }
          ), selected => {
            const cards = selected || [];

            store.prompt(state, [new ShowCardsPrompt(
              opponent.id,
              GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
              cards
            )], () => {
              MOVE_CARDS(store, state, player.discard, player.hand, { cards, sourceCard: this, sourceEffect: this.powers[0] });
            });

            return state;
          });
        }
      });
    }
    return state;
  }
}