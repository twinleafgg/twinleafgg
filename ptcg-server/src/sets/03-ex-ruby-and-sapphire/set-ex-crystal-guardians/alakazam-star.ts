import { PokemonCard, Stage, CardTag, CardType, StoreLike, State, ChooseCardsPrompt, GameMessage, SuperType, Player, StateUtils } from "../../../game";
import { CheckProvidedEnergyEffect, CheckAttackCostEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { AttackEffect } from "../../../game/store/effects/game-effects";
import { COPY_ATTACK_FROM_POKEMON_LIST } from "../../../game/store/prefabs/copy-attack-prefabs";
import { AFTER_ATTACK, SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND, WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class AlakazamStar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.STAR];
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Psychic Select',
    cost: [P],
    damage: 0,
    text: 'Put any 1 card from your discard pile into your hand.',
  },
  {
    name: 'Skill Copy',
    cost: [C, C, C],
    damage: 0,
    copycatAttack: true,
    text: "Discard a Basic Pokémon or Evolution card from your hand. Choose 1 of that card's attacks. Skill Copy copies this attack. This attack does nothing if Alakazam Star doesn't have the Energy necessary to use that attack. (You must still do anything else required for that attack.) Alakazam Star performs that attack.",
  }];

  public set: string = 'CG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '99';
  public name: string = 'Alakazam Star';
  public fullName: string = 'Alakazam Star CG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (AFTER_ATTACK(effect, 0, this)) {
      SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND(
        store,
        state,
        effect.player,
        this,
        {},
        { min: 1, max: 1, allowCancel: false },
        this.attacks[0],
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const handPokemon = player.hand.cards.filter(
        (card): card is PokemonCard => card instanceof PokemonCard,
      );

      if (handPokemon.length === 0) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          const cardToCopy = cards[0] as PokemonCard;
          if (!cardToCopy || cardToCopy.attacks.length === 0) {
            return state;
          }

          MOVE_CARDS(store, state, player.hand, player.discard, { cards: [cardToCopy], sourceCard: this });

          const { blocked } = this.buildEnergyBlockedAttacks(state, store, player, cardToCopy);

          return COPY_ATTACK_FROM_POKEMON_LIST(
            store,
            state,
            effect as AttackEffect,
            [cardToCopy],
            { allowCancel: false, blocked },
          );
        },
      );
    }
    return state;
  }

  private buildEnergyBlockedAttacks(
    state: State,
    store: StoreLike,
    player: Player,
    card: PokemonCard,
  ): { blocked: { index: number; attack: string }[] } {
    const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
    store.reduceEffect(state, checkProvidedEnergyEffect);
    const energyMap = checkProvidedEnergyEffect.energyMap;

    const blocked: { index: number; attack: string }[] = [];
    const affordableAttacks = card.attacks.filter((attack) => {
      const checkAttackCost = new CheckAttackCostEffect(player, attack);
      state = store.reduceEffect(state, checkAttackCost);
      return StateUtils.checkEnoughEnergy(energyMap, checkAttackCost.cost as CardType[]);
    });
    card.attacks.forEach((attack) => {
      if (!affordableAttacks.includes(attack)) {
        blocked.push({ index: 0, attack: attack.name });
      }
    });

    return { blocked };
  }
}
