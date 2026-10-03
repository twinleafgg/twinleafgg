import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, Card, CardTarget, ChooseEnergyPrompt, GameMessage, PlayerType, PokemonCardList, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckPokemonTypeEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import {ABILITY_USED,
  CONFIRMATION_PROMPT,
  IS_POKEPOWER_BLOCKED,
  JUST_EVOLVED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Typhlosionex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Quilava';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [R];
  public hp: number = 150;
  public weakness = [{ type: W }, { type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Bursting Up',
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn when you play Typhlosion ex from your hand to evolve 1 of your Pokémon, count the number of your opponent's Benched Pokémon. You may search your deck for up to that number of [R] Energy cards and attach them to 1 of your [R] Pokémon. Shuffle your deck afterward.",
    },
  ];

  public attacks = [
    {
      name: 'Kindle',
      cost: [R, R, C, C],
      damage: 80,
      text: 'Discard an Energy card attached to Typhlosion ex and then discard an Energy card attached to the Defending Pokémon.',
    },
  ];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '110';
  public name: string = 'Typhlosion ex';
  public fullName: string = 'Typhlosion ex UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (JUST_EVOLVED(effect, this) && !IS_POKEPOWER_BLOCKED(store, state, effect.player, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentBenched = opponent.bench.reduce(
        (left, b) => left + (b.cards.length ? 1 : 0),
        0,
      );

      CONFIRMATION_PROMPT(store, state, player, (result) => {
        if (result) {
          const blockedTo: CardTarget[] = [];
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
            const checkPokemonTypeEffect = new CheckPokemonTypeEffect(list);
            store.reduceEffect(state, checkPokemonTypeEffect);

            // Only allow Fire Pokémon as targets
            if (!checkPokemonTypeEffect.cardTypes.includes(CardType.FIRE)) {
              blockedTo.push(target);
            }
          });

          store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.CHOOSE_ENERGY_FROM_DECK,
              player.deck,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.BENCH, SlotType.ACTIVE],
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
              {
                allowCancel: true,
                min: 0,
                max: opponentBenched,
                sameTarget: true,
                blockedTo: blockedTo,
              },
            ),
            (transfers) => {
              transfers = transfers || [];

              ABILITY_USED(player, this);

              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
              }

              SHUFFLE_DECK(store, state, player);
            },
          );
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Discard energy from Typhlosion ex
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          [CardType.COLORLESS],
          { allowCancel: false },
        ),
        (energy) => {
          const cards: Card[] = (energy || []).map((e) => e.card);
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
        },
      );

      // Discard energy from opponent's active Pokémon
      return DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
    }

    return state;
  }
}
