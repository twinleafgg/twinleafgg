import { ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class WormadamTrashCloak extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Burmy Trash Cloak';
  public hp: number = 90;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Cloak Shard',
    cost: [M],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 10 damage to that Pokémon. If you have Wormadam Plant Cloak in play, this attack does 40 damage to that Pokémon instead. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Serve Trash',
    cost: [C, C],
    damage: 30,
    text: 'You may search your opponent\'s discard pile for any 1 card, show it to your opponent, and put it on top of his or her deck.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Wormadam Trash Cloak';
  public fullName: string = 'Wormadam Trash Cloak AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cloak Shard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let hasPlant = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.name === 'Wormadam Plant Cloak') {
          hasPlant = true;
        }
      });
      const damage = hasPlant ? 40 : 10;
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        if (target === opponent.active) {
          const damageEffect = new DealDamageEffect(effect, damage);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, damage);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Serve Trash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.discard.cards.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.discard,
          {},
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length === 0) {
            return;
          }
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS(store, state, opponent.discard, opponent.deck, { cards, toTop: true, sourceCard: this });
        });
      });
    }

    return state;
  }
}
