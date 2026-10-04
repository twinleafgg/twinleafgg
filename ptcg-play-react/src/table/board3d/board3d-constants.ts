/** Grid overlay Y — below cards so grid appears underneath */
export const BOARD_3D_GRID_Y = 0.1;
/** Twinleaf emblem: below tool overlays (~0.07–0.08) so center Active tools aren't occluded */
export const BOARD_3D_CENTER_EMBLEM_Y = 0.068;
/** Diameter in world units — ~fit between active rows with margin */
export const BOARD_3D_CENTER_EMBLEM_SIZE = 7;
/** Match bench / slot outline ribbon thickness */
export const BOARD_3D_BENCH_OUTLINE_THICKNESS = 0.02;
/** Grid overlay + non-bench slot ribbons (white). */
export const BOARD_3D_BENCH_OUTLINE_COLOR = 0xffffff;
/** Idle visibility for bench slot / bench-general drop planes — must be > 0 or bench reads as empty. */
export const BOARD_3D_BENCH_DROP_ZONE_IDLE_OPACITY = 0.14;
/** Idle visibility for the large bench-general drop plane behind the row. */
export const BOARD_3D_BENCH_GENERAL_DROP_ZONE_IDLE_OPACITY = 0.09;

/** Imperative deck bulk meshes: exclude from raycast lists ({@link Board3dInteractionService.updateInteractiveObjects}). */
export const BOARD3D_DECK_BULK_VISUAL_UD = 'deckBulkVisualOnly' as const;

/** Pokémon card slot footprint in world units (matches rendered card aspect). */
export const BOARD3D_CARD_SLOT_BASE_WIDTH = 2.8;
export const BOARD3D_CARD_SLOT_BASE_HEIGHT = 3.8;

/**
 * Drop-zone hit targets vs card footprint (~35% larger — middle of requested 30–40%).
 * Used by {@link Board3dDropZone} defaults, active/supporter/stadium zones, and non-bench slot outlines.
 */
export const BOARD3D_DROP_ZONE_TARGET_SCALE = 1.35;

/**
 * Bench slot drop targets — tighter than other slots so drags must land on the spot.
 * Blue bench slot outlines use the same dimensions for visualization.
 */
export const BOARD3D_BENCH_DROP_ZONE_TARGET_SCALE = 1.0;
export const BOARD3D_BENCH_DROP_ZONE_WIDTH =
  BOARD3D_CARD_SLOT_BASE_WIDTH * BOARD3D_BENCH_DROP_ZONE_TARGET_SCALE;
export const BOARD3D_BENCH_DROP_ZONE_HEIGHT =
  BOARD3D_CARD_SLOT_BASE_HEIGHT * BOARD3D_BENCH_DROP_ZONE_TARGET_SCALE;

/** Snap radius when resolving drags to small zones (active, supporter, stadium). */
export const BOARD3D_DROP_ZONE_SNAP_DISTANCE = 3.5 * BOARD3D_DROP_ZONE_TARGET_SCALE;

/**
 * Stadium drop plane vs other slot-sized targets (same base × {@link BOARD3D_DROP_ZONE_TARGET_SCALE}).
 * Extra multiplier because stadium is shared and often aimed from both sides.
 */
export const BOARD3D_STADIUM_DROP_ZONE_EXTRA_SCALE = 1.55;
