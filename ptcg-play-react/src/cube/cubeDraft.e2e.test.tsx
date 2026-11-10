// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../i18n/i18n';
import { configureSfx } from '../sfx/playSfx';
import { CubeDraftRoomPage } from './CubeDraftRoomPage';
import { CubeEditorPage } from './CubeEditorPage';
import { CubeListPage } from './CubeListPage';
import { DeckEditPage } from '../pages/DeckEditPage';

const deckMock = vi.hoisted(() => ({
  saved: [] as Array<{ id: number; name: string; cards: string[] }>,
}));

vi.mock('../context/AuthContext', async () => {
  const { SuperType, TrainerType } = await import('ptcg-server');
  const cards = Array.from({ length: 90 }, (_, i) => ({
    fullName: `Test Card ${i} TST ${i + 1}`,
    name: `Test Card ${i}`,
    set: 'TST',
    setNumber: String(i + 1),
    superType: SuperType.TRAINER,
    trainerType: TrainerType.ITEM,
    tags: [],
    attacks: [],
    powers: [],
    retreat: [],
    text: 'Integration test card.',
    cardImage: '',
  }));
  return {
    useAuth: () => ({
      user: { userId: 1, name: 'Tester', roleId: 1 },
      token: 'test-token',
      cardsInfo: { cards, hash: 'e2e-cards' },
      serverConfig: { scansUrl: '' },
      isAuthenticated: true,
      ready: true,
    }),
  };
});

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ hiddenFormats: [] }),
  useOptionalSettings: () => null,
}));

vi.mock('../context/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: () => undefined }),
}));

vi.mock('../api/deckApi', () => ({
  createDeck: vi.fn(async (name: string) => ({
    ok: true,
    deck: { id: 501, name, cards: [] },
  })),
  saveDeck: vi.fn(async (id: number, name: string, cards: string[]) => {
    deckMock.saved.push({ id, name, cards: [...cards] });
    return { ok: true, deck: { id, name, cards } };
  }),
  getDeck: vi.fn(async (id: number) => {
    const hit = deckMock.saved.find((entry) => entry.id === id) ?? deckMock.saved[deckMock.saved.length - 1];
    return {
      ok: true,
      deck: { id, name: hit?.name ?? 'Draft Deck', cards: hit?.cards ?? [] },
    };
  }),
  deleteDeck: vi.fn(async () => ({ ok: true })),
}));

/**
 * Synchronous stand-in for BroadcastChannel so every post reaches the other
 * participant's onmessage before postMessage returns. Each harness participant
 * gets its own CubeDraftChannel, exactly like two tabs.
 */
class FakeBroadcastChannel {
  static peers = new Set<FakeBroadcastChannel>();

  static reset(): void {
    FakeBroadcastChannel.peers.clear();
  }

  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.peers.add(this);
  }

  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.peers) {
      if (peer === this || peer.name !== this.name) {
        continue;
      }
      peer.onmessage?.({ data } as MessageEvent);
    }
  }

  close(): void {
    FakeBroadcastChannel.peers.delete(this);
  }

  addEventListener(): void {
    /* not used by CubeDraftChannel */
  }

  removeEventListener(): void {
    /* not used by CubeDraftChannel */
  }
}

const CUBE_NAME = 'E2E Cube';
const CLIENT_ID_KEY = 'twinleaf.cube.clientId';
const CUBES_KEY = 'twinleaf.cubes.v1';
const DRAFTS_KEY = 'twinleaf.cubeDrafts.v1';
const TOTAL_PICKS = 45;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/cube" element={<CubeListPage />} />
      <Route path="/cube/:cubeId" element={<CubeEditorPage />} />
      <Route path="/draft/:roomCode" element={<CubeDraftRoomPage />} />
      <Route path="/deck/:deckId" element={<DeckEditPage />} />
    </Routes>
  );
}

function HostApp() {
  return (
    <MemoryRouter initialEntries={['/cube']}>
      <AppRoutes />
    </MemoryRouter>
  );
}

function GuestApp({ roomCode }: { roomCode: string }) {
  return (
    <MemoryRouter initialEntries={[`/draft/${roomCode}`]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

function packTitles(container: HTMLElement): string[] {
  return within(container)
    .queryAllByTestId('pack-card')
    .map((element) => element.getAttribute('title') ?? '');
}

async function pickFirstCard(container: HTMLElement): Promise<void> {
  let card: HTMLElement | null = null;
  await waitFor(() => {
    const enabled = within(container)
      .getAllByTestId('pack-card')
      .filter((element) => !(element as HTMLButtonElement).disabled);
    expect(enabled.length).toBeGreaterThan(0);
    card = enabled[0];
  });
  if (!card) {
    throw new Error('No enabled pack card was found');
  }
  fireEvent.click(card);
}

describe('cube draft end to end', () => {
  const consoleErrors: unknown[][] = [];
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        i18n.on('initialized', () => resolve());
      });
    }
    expect(i18n.t('CUBE_TITLE')).toBe('Cube Draft');
  });

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    FakeBroadcastChannel.reset();
    deckMock.saved.length = 0;
    consoleErrors.length = 0;
    configureSfx({ enabled: false });

    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0),
    );
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle));

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: vi.fn(async () => ''),
        writeText: vi.fn(async () => undefined),
      },
    });
    vi.spyOn(window, 'prompt').mockReturnValue(CUBE_NAME);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      consoleErrors.push(args);
    });
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    expect(consoleErrors, 'unexpected console.error output').toEqual([]);
  });

  it(
    'creates a cube, drafts 45 picks between two participants, and opens the pool in the deck editor',
    async () => {
      sessionStorage.setItem(CLIENT_ID_KEY, 'host-client');
      const host = render(<HostApp />);

      // ---- Cube list renders -------------------------------------------------
      expect(within(host.container).getByRole('heading', { name: 'Cube Draft' })).toBeTruthy();

      // ---- Cube editor: create and import 90 cards ---------------------------
      const newCubeButtons = within(host.container).getAllByRole('button', { name: 'New cube' });
      fireEvent.click(newCubeButtons[0]);

      await waitFor(() => {
        expect((within(host.container).getByLabelText('Cube name') as HTMLInputElement).value).toBe(CUBE_NAME);
      });

      const importLines = Array.from(
        { length: 90 },
        (_, i) => `1 Test Card ${i} TST ${i + 1}`,
      ).join('\n');
      const readText = navigator.clipboard.readText as ReturnType<typeof vi.fn>;
      readText.mockResolvedValue(importLines);

      fireEvent.click(within(host.container).getByRole('button', { name: 'Import' }));
      await waitFor(() => {
        expect(within(host.container).getByText('90 / 360 cards')).toBeTruthy();
      });

      fireEvent.click(within(host.container).getByRole('button', { name: 'Save' }));
      await waitFor(() => {
        const cubes = JSON.parse(localStorage.getItem(CUBES_KEY) ?? '[]') as Array<{ cards: string[] }>;
        expect(cubes).toHaveLength(1);
        expect(cubes[0].cards).toHaveLength(90);
      });

      // Seed starting cards + mutant flag, then host (Host draft re-reads the saved cube).
      const cubesBeforeHost = JSON.parse(localStorage.getItem(CUBES_KEY) ?? '[]') as Array<Record<string, unknown>>;
      cubesBeforeHost[0] = {
        ...cubesBeforeHost[0],
        startingCards: ['Test Card 0 TST 1'],
        mutantEvolution: true,
      };
      localStorage.setItem(CUBES_KEY, JSON.stringify(cubesBeforeHost));

      // ---- Host the draft ----------------------------------------------------
      fireEvent.click(within(host.container).getByRole('button', { name: 'Host draft' }));
      await waitFor(() => {
        expect(within(host.container).getByRole('heading', { name: 'Draft lobby' })).toBeTruthy();
        expect(within(host.container).getByText('Players (1 / 8)')).toBeTruthy();
        expect(within(host.container).getByText('You start with')).toBeTruthy();
        expect(within(host.container).getByText(/Mutant Evolution/)).toBeTruthy();
      });

      const rooms = Object.values(
        JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '{}') as Record<string, { id: string }>,
      );
      expect(rooms).toHaveLength(1);
      const roomCode = rooms[0].id;
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

      // ---- Second participant joins -----------------------------------------
      sessionStorage.setItem(CLIENT_ID_KEY, 'guest-client');
      const guest = render(<GuestApp roomCode={roomCode} />);

      await waitFor(() => {
        expect(within(host.container).getByText('Players (2 / 8)')).toBeTruthy();
        expect(within(guest.container).getByText('Players (2 / 8)')).toBeTruthy();
      });

      // ---- Ready up and start ------------------------------------------------
      fireEvent.click(within(host.container).getByRole('button', { name: 'I am ready' }));
      fireEvent.click(within(guest.container).getByRole('button', { name: 'I am ready' }));

      await waitFor(() => {
        const start = within(host.container).getByRole('button', { name: 'Start draft' }) as HTMLButtonElement;
        expect(start.disabled).toBe(false);
      });
      fireEvent.click(within(host.container).getByRole('button', { name: 'Start draft' }));

      await waitFor(() => {
        expect(within(host.container).getByRole('heading', { name: 'Your pack' })).toBeTruthy();
        expect(within(guest.container).getByRole('heading', { name: 'Your pack' })).toBeTruthy();
      });

      expect(packTitles(host.container)).toHaveLength(15);
      expect(packTitles(guest.container)).toHaveLength(15);

      // ---- Draft 45 picks each, passing packs left --------------------------
      for (let pick = 0; pick < TOTAL_PICKS; pick++) {
        const hostBefore = packTitles(host.container);
        const guestBefore = packTitles(guest.container);

        await pickFirstCard(host.container);
        await pickFirstCard(guest.container);

        if (pick === 0) {
          // After a left pass the host holds the guest's remainder and vice versa.
          await waitFor(() => {
            expect(packTitles(host.container)).toEqual(guestBefore.slice(1));
            expect(packTitles(guest.container)).toEqual(hostBefore.slice(1));
          });
        }
      }

      await waitFor(() => {
        expect(within(host.container).getByRole('heading', { name: 'Draft complete' })).toBeTruthy();
        expect(within(guest.container).getByRole('heading', { name: 'Draft complete' })).toBeTruthy();
        expect(within(host.container).getAllByText('45 / 45').length).toBeGreaterThan(0);
        expect(within(guest.container).getAllByText('45 / 45').length).toBeGreaterThan(0);
      });

      // ---- Save the pool as a deck and open the editor ----------------------
      const saveAsDeck = within(host.container).getByRole('button', { name: 'Save as deck' });
      fireEvent.click(saveAsDeck);

      await waitFor(() => {
        expect(deckMock.saved).toHaveLength(1);
      });
      expect(deckMock.saved[0].name).toBe('E2E Cube Draft');
      expect(deckMock.saved[0].cards).toHaveLength(TOTAL_PICKS + 1);
      expect(deckMock.saved[0].cards[0]).toBe('Test Card 0 TST 1');
      expect(new Set(deckMock.saved[0].cards.slice(1)).size).toBe(TOTAL_PICKS);

      await waitFor(() => {
        expect(within(host.container).getByText('Your deck (46 cards)')).toBeTruthy();
        expect(within(host.container).getAllByText('E2E Cube Draft').length).toBeGreaterThan(0);
      });
    },
    120_000,
  );
});
