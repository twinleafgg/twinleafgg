import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, ChooseCardsPrompt, TrainerCard, ChoosePokemonPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';

export class Mimikyu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 70;
  public retreat = [C];

  public attacks = [
    {
      name: 'Impersonation',
      cost: [C],
      damage: 0,
      text: 'Discard a Supporter card from your hand. If you do, use the effect of that card as the effect of this attack.'
    },
    {
      name: 'Mischevious Hands',
      cost: [P],
      damage: 0,
      text: 'Choose 2 of your opponent\'s Pokémon and put 2 damage counters on each of them.'
    }
  ];

  public set: string = 'CEC';
  public name: string = 'Mimikyu';
  public fullName: string = 'Mimikyu CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Impersonation
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const supportersInHand = player.hand.cards.filter(card => {
        card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER;
      });

      if (!supportersInHand) { return state; }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
        player.hand,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        if (cards === null || cards.length === 0) {
          return;
        }
        const trainerCard = cards[0] as TrainerCard;
        player.supporterTurn -= 1;
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        const playTrainerEffect = new TrainerEffect(player, trainerCard);
        store.reduceEffect(state, playTrainerEffect);
      });
    }

    // Mischevous Hands
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some(b => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      const benched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
      const count = 1 + Math.min(1, benched);

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: count, max: count, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        targets.forEach(target => {
          const counters = new PutCountersEffect(effect, 20);
          counters.target = target;
          store.reduceEffect(state, counters);
        });
      });
    }

    return state;
  }

}
