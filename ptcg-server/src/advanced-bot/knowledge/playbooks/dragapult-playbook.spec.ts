import {
  State, Player, PokemonCardList, PokemonCard, Stage, CardType, BoardEffect, PowerType
} from '../../../game';
import { DragapultPlaybook } from './dragapult-playbook';

class TestDreepy extends PokemonCard {
  name = 'Dreepy';
  fullName = 'Dreepy TWM';
  set = 'TWM';
  hp = 70;
  stage = Stage.BASIC;
  cardType = [CardType.COLORLESS];
}

class TestDrakloak extends PokemonCard {
  name = 'Drakloak';
  fullName = 'Drakloak TWM';
  set = 'TWM';
  hp = 90;
  stage = Stage.STAGE_1;
  cardType = [CardType.COLORLESS];
  powers = [{
    name: 'Recon Directive',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: ''
  }];
}

class TestDragapult extends PokemonCard {
  name = 'Dragapult ex';
  fullName = 'Dragapult ex TWM';
  set = 'TWM';
  hp = 320;
  stage = Stage.STAGE_2;
  cardType = [CardType.DRAGON];
}

class TestBudew extends PokemonCard {
  name = 'Budew';
  fullName = 'Budew PRE';
  set = 'PRE';
  hp = 30;
  stage = Stage.BASIC;
  cardType = [CardType.GRASS];
}

describe('DragapultPlaybook', () => {
  const playbook = new DragapultPlaybook();

  function slot(card: PokemonCard): PokemonCardList {
    const s = new PokemonCardList();
    s.cards = [card];
    return s;
  }

  function createPlayers(): { state: State; player: Player; opponent: Player } {
    const state = new State();
    const player = new Player();
    player.id = 0;
    player.active = slot(new TestBudew());
    const opponent = new Player();
    opponent.id = 1;
    opponent.active = slot(new TestDreepy());
    // 6 prize cards each
    for (let i = 0; i < 6; i++) {
      player.prizes.push(new PokemonCardList());
      opponent.prizes.push(new PokemonCardList());
      player.prizes[i].cards = [new TestDreepy()];
      opponent.prizes[i].cards = [new TestDreepy()];
    }
    state.players.push(player, opponent);
    return { state, player, opponent };
  }

  it('detects setup phase and rewards Drakloak + unused Recon', () => {
    const { state, player } = createPlayers();
    player.bench = [
      slot(new TestDrakloak()),
      slot(new TestDrakloak()),
      slot(new TestDreepy()),
    ];

    const snap = playbook.getSnapshot(state, player);
    expect(snap.phase).toBe('setup');
    expect(snap.drakloakCount).toBe(2);
    expect(snap.unusedReconCount).toBe(2);
    expect(snap.budewActive).toBe(true);

    const score = playbook.adjustScore(state, player.id);
    expect(score).toBeGreaterThan(200);
  });

  it('moves to pressure when Dragapult is on board and prefers it active', () => {
    const { state, player } = createPlayers();
    player.active = slot(new TestDragapult());
    player.bench = [
      slot(new TestDrakloak()),
      slot(new TestDrakloak()),
      slot(new TestDrakloak()),
    ];

    const snap = playbook.getSnapshot(state, player);
    expect(snap.phase).toBe('pressure');
    expect(snap.dragapultActive).toBe(true);

    const withDragapult = playbook.adjustScore(state, player.id);

    player.active = slot(new TestBudew());
    player.bench.push(slot(new TestDragapult()));
    const withBudew = playbook.adjustScore(state, player.id);

    expect(withDragapult).toBeGreaterThan(withBudew);
  });

  it('does not count Recon after ability used marker', () => {
    const { state, player } = createPlayers();
    const drak = new TestDrakloak();
    const list = slot(drak);
    list.addBoardEffect(BoardEffect.ABILITY_USED);
    player.bench = [list];

    const snap = playbook.getSnapshot(state, player);
    expect(snap.unusedReconCount).toBe(0);
  });

  it('preferAttack strongly favors Phantom Dive', () => {
    const { state, player } = createPlayers();
    player.active = slot(new TestDragapult());
    const snap = playbook.getSnapshot(state, player);
    expect(playbook.preferAttack('Phantom Dive', snap))
      .toBeGreaterThan(playbook.preferAttack('Jet Headbutt', snap));
  });
});
