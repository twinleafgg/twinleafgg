import {
  State, Player, GameMessage, PokemonCardList, PutDamagePrompt, PlayerType,
  SlotType, PokemonCard, DamageMap, CardTag, Stage, CardType
} from '../../game';
import { optimizePutDamage } from './put-damage-optimizer';

class BenchBasic extends PokemonCard {
  name = 'Bench Basic';
  fullName = 'Bench Basic TEST';
  set = 'test';
  hp = 70;
  stage = Stage.BASIC;
  cardType = [CardType.COLORLESS];
}

class BenchEx extends PokemonCard {
  name = 'Bench Ex';
  fullName = 'Bench Ex TEST';
  set = 'test';
  hp = 200;
  stage = Stage.BASIC;
  cardType = [CardType.COLORLESS];
  protected _tags = [CardTag.POKEMON_ex];
}

describe('optimizePutDamage (Phantom Dive)', () => {
  function createSlot(card: PokemonCard, damage = 0): PokemonCardList {
    const slot = new PokemonCardList();
    slot.cards = [card];
    slot.damage = damage;
    return slot;
  }

  function createState(): { state: State; player: Player; opponent: Player } {
    const state = new State();
    const player = new Player();
    player.id = 0;
    player.active = createSlot(new BenchBasic());
    const opponent = new Player();
    opponent.id = 1;
    opponent.active = createSlot(new BenchBasic());
    state.players.push(player, opponent);
    return { state, player, opponent };
  }

  function benchPrompt(playerId: number, damage: number, targets: { player: Player; slots: PokemonCardList[] }): PutDamagePrompt {
    const damageMap: DamageMap[] = [];
    targets.slots.forEach((_, index) => {
      damageMap.push({
        target: { player: PlayerType.TOP_PLAYER, slot: SlotType.BENCH, index },
        damage: 9999
      });
    });
    return new PutDamagePrompt(
      playerId,
      GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
      PlayerType.TOP_PLAYER,
      [SlotType.BENCH],
      damage,
      damageMap,
      { allowCancel: false }
    );
  }

  it('splits 60 damage to KO two 30-HP-left bench Pokémon instead of dumping on one', () => {
    const { state, player, opponent } = createState();
    const a = createSlot(new BenchBasic(), 40); // 30 HP left
    const b = createSlot(new BenchBasic(), 40); // 30 HP left
    const c = createSlot(new BenchEx(), 0); // 200 HP left
    opponent.bench = [a, b, c];

    const prompt = benchPrompt(player.id, 60, { player: opponent, slots: opponent.bench });
    const result = optimizePutDamage(state, prompt);

    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(2);

    const byIndex = new Map(result!.map(r => [r.target.index, r.damage]));
    // Should KO both low-HP basics (30 each) rather than put all 60 on the ex
    expect(byIndex.get(0)).toBe(30);
    expect(byIndex.get(1)).toBe(30);
  });

  it('prefers KO on a 2-prize Pokémon when counters allow', () => {
    const { state, player, opponent } = createState();
    const basic = createSlot(new BenchBasic(), 0); // 70 HP
    const ex = createSlot(new BenchEx(), 140); // 60 HP left
    opponent.bench = [basic, ex];

    const prompt = benchPrompt(player.id, 60, { player: opponent, slots: opponent.bench });
    const result = optimizePutDamage(state, prompt);

    expect(result).not.toBeNull();
    const exDamage = result!.find(r => r.target.index === 1);
    expect(exDamage?.damage).toBe(60);
  });

  it('uses real remaining HP rather than maxAllowedDamage 9999', () => {
    const { state, player, opponent } = createState();
    const a = createSlot(new BenchBasic(), 50); // 20 HP left
    const b = createSlot(new BenchBasic(), 50); // 20 HP left
    const c = createSlot(new BenchBasic(), 50); // 20 HP left
    opponent.bench = [a, b, c];

    const prompt = benchPrompt(player.id, 60, { player: opponent, slots: opponent.bench });
    const result = optimizePutDamage(state, prompt);

    expect(result).not.toBeNull();
    // Three KOs of 20 each = 60
    expect(result!.length).toBe(3);
    expect(result!.every(r => r.damage === 20)).toBe(true);
  });
});
