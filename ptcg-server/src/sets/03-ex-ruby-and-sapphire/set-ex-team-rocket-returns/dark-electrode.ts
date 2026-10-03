import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  GameError,
  PowerType,
  Card,
  ChooseCardsPrompt,
  PlayerType,
  SlotType,
  StateUtils,
  CardTarget,
  MoveEnergyPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  CONFIRMATION_PROMPT,
  IS_POKEPOWER_BLOCKED,
  REMOVE_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';

export class DarkElectrode extends PokemonCard {
  protected _tags = [CardTag.DARK];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Voltorb';
  public cardType: CardType[] = [L, D];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Darkness Navigation',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), if Dark Electrode has no Energy attached to it, you may search your deck for a [D] or Dark Metal Energy and attach it to Dark Electrode. Shuffle your deck afterward. This power can't be used if Dark Electrode is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Energy Bomb',
      cost: [L],
      damage: 30,
      text: 'You may move all Energy cards attached to Dark Electrode to your Benched Pokémon in any way you like.',
    },
  ];

  public set: string = 'TRR';
  public setNumber: string = '4';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Dark Electrode';
  public fullName: string = 'Dark Electrode TRR';

  public readonly DARKNESS_NAVIGATION_MARKER = 'DARKNESS_NAVIGATION_MARKER';
  public usedEnergyBomb = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      REMOVE_MARKER(this.DARKNESS_NAVIGATION_MARKER, player, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DARKNESS_NAVIGATION_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const thisElectrode = StateUtils.findCardList(state, effect.card);

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      if (player.marker.hasMarker(this.DARKNESS_NAVIGATION_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let thisCardList;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card === effect.card) {
          thisCardList = cardList;
        }
      });

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, thisCardList);
      state = store.reduceEffect(state, checkProvidedEnergy);

      if (checkProvidedEnergy.energyMap.length !== 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (
          !(
            card.superType === SuperType.ENERGY &&
            (card.name === 'Darkness Energy' || card.name === 'Dark Metal Energy')
          )
        ) {
          blocked.push(index);
        }
      });

      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_ENERGY_FROM_DECK,
          player.deck,
          { superType: SuperType.ENERGY },
          { min: 0, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          cards = selected || [];

          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, thisElectrode, { cards: cards, sourceCard: this });
          }

          SHUFFLE_DECK(store, state, player);
        },
      );

      ADD_MARKER(this.DARKNESS_NAVIGATION_MARKER, player, this);
      ABILITY_USED(player, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedEnergyBomb = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedEnergyBomb === true) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      CONFIRMATION_PROMPT(
        store,
        state,
        player,
        (result) => {
          if (result) {
            const blockedCards: Card[] = [];
            const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
              const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
              store.reduceEffect(state, checkProvidedEnergy);

              checkProvidedEnergy.energyMap.forEach((em) => {
                if (em.provides.length === 0) {
                  blockedCards.push(em.card);
                }
              });

              const blocked: number[] = [];
              blockedCards.forEach((bc) => {
                const index = cardList.cards.indexOf(bc);
                if (index !== -1 && !blocked.includes(index)) {
                  blocked.push(index);
                }
              });

              if (blocked.length !== 0) {
                blockedMap.push({ source: target, blocked });
              }
            });

            const attachedEnergies = player.active.cards.filter(
              (card) => !blockedCards.includes(card),
            );

            // Energy is coming from active to bench
            const blockedFrom: CardTarget[] = [];
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
              if (cardList !== player.active) {
                blockedFrom.push(target);
                return;
              }
            });

            store.prompt(
              state,
              new MoveEnergyPrompt(
                player.id,
                GameMessage.MOVE_ENERGY_CARDS,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                {},
                {
                  allowCancel: false,
                  min: attachedEnergies.length,
                  max: attachedEnergies.length,
                  blockedMap,
                  blockedFrom,
                },
              ),
              (transfers) => {
                transfers = transfers || [];
                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
                }
              },
            );
          }
        },
        GameMessage.MOVE_ENERGY_TO_BENCH,
      );
    }

    if (effect instanceof EndTurnEffect && this.usedEnergyBomb) {
      this.usedEnergyBomb = false;
    }

    return state;
  }
}
