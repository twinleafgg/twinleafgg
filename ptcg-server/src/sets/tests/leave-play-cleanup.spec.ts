import { PlayerType, SlotType } from '../../game/store/actions/play-card-action';
import { SpecialCondition } from '../../game/store/card/card-types';
import { MOVE_CARDS, MOVE_POKEMON_OFF_BOARD } from '../../game/store/prefabs/prefabs';
import { ChoosePokemonPromptType } from '../../game/store/prompts/choose-pokemon-prompt';
import { PokemonCardList } from '../../game/store/state/pokemon-card-list';
import {
  getDamage,
  hasSpecialCondition,
  playTrainerCard,
  zoneContains,
} from './card-test-helpers';
import { padDeck, setupGame } from './test-helpers';

function expectVacatedSlot(slot: PokemonCardList): void {
  expect(slot.cards.length).toBe(0);
  expect(slot.tools.length).toBe(0);
  expect(slot.energies.cards.length).toBe(0);
  expect(slot.damage).toBe(0);
  expect(slot.specialConditions.length).toBe(0);
  expect(slot.marker.markers.length).toBe(0);
  expect(slot.attackCostIncreaseWhileActive).toBe(0);
  expect(slot.cannotRetreatWhileActive).toBe(false);
  expect(slot.abilityLockActivationOrder).toBe(0);
  expect(slot.hpBonus).toBe(0);
  expect(slot.boardEffect.length).toBe(0);
}

function seedDirtySlot(slot: PokemonCardList): void {
  slot.damage = 50;
  slot.addSpecialCondition(SpecialCondition.POISONED);
  slot.addSpecialCondition(SpecialCondition.ASLEEP);
  slot.attackCostIncreaseWhileActive = 2;
  slot.cannotRetreatWhileActive = true;
  slot.abilityLockActivationOrder = 3;
  slot.hpBonus = 30;
  const source = slot.getPokemonCard();
  if (source) {
    slot.marker.addMarker('TEST_LEAVE_PLAY_MARKER', source);
  }
}

describe('Leave-play cleanup — MOVE_POKEMON_OFF_BOARD / vacated slots', () => {
  describe('prefab: same destination', () => {
    it('moves pokemon + energy + tools to hand and fully resets the slot', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: {
            card: 'Manaphy BRS',
            energy: ['Water Energy SVE', 'Psychic Energy SVE'],
            tools: ['Vitality Band SVI'],
            damage: 40,
          },
          bench: [{ card: 'Ralts SIT' }],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      seedDirtySlot(player.active);

      MOVE_POKEMON_OFF_BOARD(game.store, game.state, player.active, {
        pokemonDestination: player.hand,
      });

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Psychic Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(player.active);
      expect(hasSpecialCondition(game.state, 0, 'active', SpecialCondition.POISONED)).toBe(false);
    });

    it('moves pokemon + attachments to deck and clears slot state', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: {
            card: 'Manaphy BRS',
            energy: ['Water Energy SVE'],
            tools: ['Vitality Band SVI'],
            damage: 20,
          },
          bench: [{ card: 'Ralts SIT' }],
          deck: padDeck(5),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      seedDirtySlot(player.active);

      MOVE_POKEMON_OFF_BOARD(game.store, game.state, player.active, {
        pokemonDestination: player.deck,
      });

      expect(zoneContains(game.state, 0, 'deck', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'deck', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'deck', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(player.active);
    });

    it('moves pokemon + attachments to discard and clears slot state', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: {
            card: 'Manaphy BRS',
            energy: ['Water Energy SVE'],
            tools: ['Vitality Band SVI'],
            damage: 30,
          },
          bench: [{ card: 'Ralts SIT' }],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      seedDirtySlot(player.active);

      MOVE_POKEMON_OFF_BOARD(game.store, game.state, player.active, {
        pokemonDestination: player.discard,
      });

      expect(zoneContains(game.state, 0, 'discard', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(player.active);
    });
  });

  describe('prefab: split destinations', () => {
    it('puts pokemon in hand and attachments in discard, then resets the slot', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: {
            card: 'Manaphy BRS',
            energy: ['Water Energy SVE', 'Lightning Energy SVE'],
            tools: ['Vitality Band SVI'],
            damage: 60,
          },
          bench: [{ card: 'Ralts SIT' }],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      seedDirtySlot(player.active);

      MOVE_POKEMON_OFF_BOARD(game.store, game.state, player.active, {
        pokemonDestination: player.hand,
        attachedDestination: player.discard,
      });

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Manaphy BRS')).toBe(false);

      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Lightning Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(false);
      expect(zoneContains(game.state, 0, 'hand', 'Vitality Band SVI')).toBe(false);

      expectVacatedSlot(player.active);
    });

    it('puts pokemon in lost zone and attachments in discard', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: {
            card: 'Manaphy BRS',
            energy: ['Water Energy SVE'],
            tools: ['Vitality Band SVI'],
            damage: 10,
          },
          bench: [{ card: 'Ralts SIT' }],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      seedDirtySlot(player.active);

      MOVE_POKEMON_OFF_BOARD(game.store, game.state, player.active, {
        pokemonDestination: player.lostzone,
        attachedDestination: player.discard,
      });

      expect(zoneContains(game.state, 0, 'lostzone', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(player.active);
    });
  });

  describe('engine: orphan tool salvage on partial pokemon-first move', () => {
    it('discards leftover tools when pokemon leave first via partial MOVE_CARDS', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: {
            card: 'Manaphy BRS',
            energy: ['Water Energy SVE'],
            tools: ['Vitality Band SVI'],
            damage: 40,
          },
          bench: [{ card: 'Ralts SIT' }],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      seedDirtySlot(player.active);
      const pokemons = player.active.getPokemons();

      // Pokemon-first partial move — previously wiped tools without discarding them
      MOVE_CARDS(game.store, game.state, player.active, player.hand, { cards: pokemons });

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(player.active);
    });
  });

  describe('vacated slot reuse', () => {
    it('does not re-place prior damage or conditions when a new pokemon occupies the slot', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 80,
            },
          ],
          hand: ['Manaphy BRS'],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      const player = game.state.players[0];
      const benchSlot = player.bench[0];
      seedDirtySlot(benchSlot);

      MOVE_POKEMON_OFF_BOARD(game.store, game.state, benchSlot, {
        pokemonDestination: player.hand,
        attachedDestination: player.discard,
      });
      expectVacatedSlot(benchSlot);

      // Place a fresh Basic onto the vacated bench slot
      const replacement = player.hand.cards.find(c => c.fullName === 'Manaphy BRS');
      expect(replacement).toBeDefined();
      player.hand.moveCardTo(replacement!, benchSlot);

      expect(getDamage(game.state, 0, 0)).toBe(0);
      expect(hasSpecialCondition(game.state, 0, 0, SpecialCondition.POISONED)).toBe(false);
      expect(benchSlot.tools.length).toBe(0);
      expect(benchSlot.attackCostIncreaseWhileActive).toBe(0);
    });
  });

  describe('card integrations', () => {
    it('Penny: Basic + all attached cards go to hand; slot is clean', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 30,
            },
          ],
          hand: ['Penny SVI'],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, 'Penny SVI');

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });

    it('Scoop Up Net: pokemon to hand, attachments to discard; slot is clean', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 50,
            },
          ],
          hand: ['Scoop Up Net RCL'],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, 'Scoop Up Net RCL');

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(false);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });

    it('AZ: pokemon to hand, attachments to discard; slot is clean', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 20,
            },
          ],
          hand: ['AZ PHF'],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, 'AZ PHF');

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });

    it("Professor Turo's Scenario: pokemon to hand, attachments to discard; slot is clean", () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 40,
            },
          ],
          hand: ["Professor Turo's Scenario PAR"],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, "Professor Turo's Scenario PAR");

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'discard', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });

    it('Scoop Up Cyclone: pokemon + attachments to hand; slot is clean', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 70,
            },
          ],
          hand: ['Scoop Up Cyclone TWM'],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, 'Scoop Up Cyclone TWM');

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });

    it('Acerola: damaged pokemon + attachments to hand; slot is clean', () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Manaphy BRS',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 30,
            },
          ],
          hand: ['Acerola BUS'],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, 'Acerola BUS');

      expect(zoneContains(game.state, 0, 'hand', 'Manaphy BRS')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });

    it("Cheren's Care: Colorless pokemon + attachments to hand; slot is clean", () => {
      const game = setupGame({
        turn: 2,
        player1: {
          active: { card: 'Ralts SIT' },
          bench: [
            {
              card: 'Skwovet SVI',
              energy: ['Water Energy SVE'],
              tools: ['Vitality Band SVI'],
              damage: 20,
            },
          ],
          hand: ["Cheren's Care BRS"],
          deck: padDeck(10),
        },
        player2: {
          active: { card: 'Ralts SIT' },
          deck: padDeck(10),
        },
      });

      seedDirtySlot(game.state.players[0].bench[0]);

      game.overridePrompt(ChoosePokemonPromptType, () => [
        { player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: 0 },
      ]);

      playTrainerCard(game.store, game.state, 0, "Cheren's Care BRS");

      expect(zoneContains(game.state, 0, 'hand', 'Skwovet SVI')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Water Energy SVE')).toBe(true);
      expect(zoneContains(game.state, 0, 'hand', 'Vitality Band SVI')).toBe(true);
      expectVacatedSlot(game.state.players[0].bench[0]);
    });
  });
});
