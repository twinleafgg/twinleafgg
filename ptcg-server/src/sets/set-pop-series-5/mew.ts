import { PokemonCard, Stage, CardType, EnergyType, CardTag, SuperType, StoreLike, State, StateUtils, GameMessage, AttachEnergyPrompt, PlayerType, SlotType } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { COPY_ATTACK_FROM_POKEMON_LIST, buildAttackListWithEnergyBlocking } from '../../game/store/prefabs/copy-attack-prefabs';
import { MOVE_CARD_TO, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Mew extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 60;
  public cardType: CardType[] = [R];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      // Copy
      name: 'Copy',
      cost: [C],
      damage: 0,
      copycatAttack: true,
      text: "Choose 1 of the Defending Pokémon's attacks. Copy copies that attack. This attack does nothing if Mew doesn't have the Energy necessary to use that attack. (You must still do anything else required for that attack.) Mew performs that attack.",
    },
    {
      // Extra Draw
      name: 'Extra Draw',
      cost: [R],
      damage: 0,
      text: 'If your opponent has any Pokémon-ex in play, search your deck for up to 2 basic Energy cards and attach them to Mew. Shuffle your deck afterward.',
    },
  ];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Mew';
  public fullName: string = 'Mew P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active.getPokemonCard();
      if (!opponentActive) {
        return state;
      }
      const { pokemonCards, blocked } = buildAttackListWithEnergyBlocking(state, store, player, {
        extraCards: [opponentActive],
      });
      if (pokemonCards.length === 0) {
        return state;
      }
      return COPY_ATTACK_FROM_POKEMON_LIST(store, state, effect, pokemonCards, {
        allowCancel: true,
        blocked,
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let hasexPokemon = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        const pokemonCard = cardList.getPokemonCard();
        if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_ex)) {
          hasexPokemon = true;
        }
      });
      if (hasexPokemon) {
        store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_CARDS,
            player.deck,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { min: 0, max: 2, allowCancel: true },
          ),
          (transfers) => {
            transfers = transfers || [];
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARD_TO(state, transfer.card, target);
            }
            SHUFFLE_DECK(store, state, player);
          },
        );
      }
    }
    return state;
  }
}
