import { Card } from '../../game/store/card/card';
import { TestPokemon } from './test-pokemon';

// Other test cards under this directory are gitignored for local-only use.
// Keep this index limited to files that are tracked so production builds succeed.
export const setTest: Card[] = [
  new TestPokemon(),
];
