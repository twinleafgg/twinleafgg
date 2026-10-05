import { SRGBColorSpace, TextureLoader, Texture, RepeatWrapping } from 'three';
import type { HoloVariant } from '../../../components/cards/holoVariant';
import { holoMaskUrl } from '../../../components/cards/holoMaskUrl';
import { publicAssetUrl } from '../../../utils/publicAssetUrl';
import { imageUrlNeedsCrossOrigin, isProxiedImageUrl, proxyImageUrlForWebGl } from '../../../utils/proxyImageUrl';
import { evictBoard3dCardFaceMaterialsForTexture } from '../board3dCardShared';

/** Resolve local asset paths, then proxy external scans for WebGL. */
function resolveTextureRequestUrl(url: string): string {
  const t = url.trim();
  if (!t) {
    return t;
  }
  if (isProxiedImageUrl(t)) {
    return t;
  }
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('//')) {
    return proxyImageUrlForWebGl(t);
  }
  const local = t.startsWith('/') ? t : publicAssetUrl(t);
  return proxyImageUrlForWebGl(local);
}

/** Soft cap for scan/sleeve/tool/marker textures kept mid-session. */
const MAX_TEXTURE_CACHE_SIZE = 256;

export class Board3dAssetLoaderService {
  private textureLoader: TextureLoader;
  private textureCache: Map<string, Texture>;
  /** URLs that must never be LRU-evicted (board chrome). */
  private pinnedTextureUrls = new Set<string>();
  private cardBackTexture: Texture | null = null;
  private boardGridTexture: Texture | null = null;
  private slotGridTexture: Texture | null = null;
  private cardMaskTexture: Texture | null = null;
  private holo2dMaskByUrl: Map<string, Texture> = new Map();
  /** GPU max anisotropy; updated once the WebGL renderer is ready. */
  private maxAnisotropy = 16;

  private readonly MAX_CONCURRENT_LOADS = 6;
  private activeLoads = 0;
  private loadQueue: Array<() => void> = [];

  constructor() {
    this.textureLoader = new TextureLoader();
    this.textureCache = new Map();
  }

  /** Touch an existing cache entry so LRU eviction prefers older unused scans. */
  private touchTextureCache(key: string): Texture | undefined {
    const texture = this.textureCache.get(key);
    if (!texture) {
      return undefined;
    }
    // Re-insert to move to Map insertion-order end (most recently used).
    this.textureCache.delete(key);
    this.textureCache.set(key, texture);
    return texture;
  }

  private setTextureCache(key: string, texture: Texture, pinned = false): void {
    if (pinned) {
      this.pinnedTextureUrls.add(key);
    }
    this.textureCache.delete(key);
    this.textureCache.set(key, texture);
    this.evictTextureCacheIfNeeded();
  }

  private evictTextureCacheIfNeeded(): void {
    while (this.textureCache.size > MAX_TEXTURE_CACHE_SIZE) {
      let evicted = false;
      for (const [key, texture] of this.textureCache) {
        if (this.pinnedTextureUrls.has(key)) {
          continue;
        }
        this.textureCache.delete(key);
        evictBoard3dCardFaceMaterialsForTexture(texture);
        texture.dispose();
        evicted = true;
        break;
      }
      if (!evicted) {
        break;
      }
    }
  }

  /** Prefer the renderer's {@link WebGLCapabilities.getMaxAnisotropy}; reapplies to cached textures. */
  setMaxAnisotropy(value: number): void {
    const next = Math.max(1, Math.floor(value) || 16);
    if (next === this.maxAnisotropy) {
      return;
    }
    this.maxAnisotropy = next;
    for (const texture of this.textureCache.values()) {
      texture.anisotropy = this.maxAnisotropy;
      texture.needsUpdate = true;
    }
    for (const texture of this.holo2dMaskByUrl.values()) {
      texture.anisotropy = this.maxAnisotropy;
      texture.needsUpdate = true;
    }
    if (this.cardBackTexture) {
      this.cardBackTexture.anisotropy = this.maxAnisotropy;
      this.cardBackTexture.needsUpdate = true;
    }
    if (this.boardGridTexture) {
      this.boardGridTexture.anisotropy = this.maxAnisotropy;
      this.boardGridTexture.needsUpdate = true;
    }
    if (this.slotGridTexture) {
      this.slotGridTexture.anisotropy = this.maxAnisotropy;
      this.slotGridTexture.needsUpdate = true;
    }
    if (this.cardMaskTexture) {
      this.cardMaskTexture.anisotropy = this.maxAnisotropy;
      this.cardMaskTexture.needsUpdate = true;
    }
  }

  private applyAnisotropy(texture: Texture): void {
    texture.anisotropy = this.maxAnisotropy;
  }

  private async withConcurrencyLimit<T>(loadFn: () => Promise<T>): Promise<T> {
    while (this.activeLoads >= this.MAX_CONCURRENT_LOADS) {
      await new Promise<void>(resolve => this.loadQueue.push(resolve));
    }
    this.activeLoads++;
    try {
      return await loadFn();
    } finally {
      this.activeLoads--;
      const next = this.loadQueue.shift();
      if (next) next();
    }
  }

  /**
   * Synchronous return when a scan is already in {@link loadCardTexture}'s cache.
   * Prevents re-applying a placeholder and clearing holo on every state sync.
   */
  getCardTextureIfCached(scanUrl: string | undefined | null): Texture | null {
    if (!scanUrl || !String(scanUrl).trim()) {
      return null;
    }
    const resolved = resolveTextureRequestUrl(scanUrl);
    return this.touchTextureCache(resolved) ?? null;
  }

  /**
   * Load a card texture using the existing image cache service
   */
  async loadCardTexture(scanUrl: string): Promise<Texture> {
    const resolved = resolveTextureRequestUrl(scanUrl);
    const cached = this.touchTextureCache(resolved);
    if (cached) {
      return cached;
    }

    return this.withConcurrencyLimit(async () => {
      const again = this.touchTextureCache(resolved);
      if (again) {
        return again;
      }

      try {
        const loader = imageUrlNeedsCrossOrigin(resolved)
          ? new TextureLoader().setCrossOrigin('anonymous')
          : this.textureLoader;
        const texture = await loader.loadAsync(resolved);

        texture.colorSpace = 'srgb';
        this.applyAnisotropy(texture);
        texture.flipY = true;

        this.setTextureCache(resolved, texture);
        return texture;
    } catch (error) {
      console.warn('Failed to load card texture:', resolved, (error as Error)?.message);
      return this.loadCardBack();
    }
    });
  }

  /**
   * Load a custom tool icon texture - direct from URL, same as 2D.
   */
  async loadToolIconTexture(iconPath: string): Promise<Texture> {
    const resolved = resolveTextureRequestUrl(iconPath);
    const cached = this.touchTextureCache(resolved);
    if (cached) {
      return cached;
    }
    try {
      const loader = imageUrlNeedsCrossOrigin(resolved)
        ? new TextureLoader().setCrossOrigin('anonymous')
        : this.textureLoader;
      const texture = await loader.loadAsync(resolved);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);
      texture.flipY = true;
      this.setTextureCache(resolved, texture);
      return texture;
    } catch (error) {
      console.warn('Failed to load tool icon texture:', resolved);
      throw error;
    }
  }

  /**
   * Load a sleeve texture - direct from URL, same as 2D.
   */
  async loadSleeveTexture(sleeveUrl: string): Promise<Texture> {
    const resolved = resolveTextureRequestUrl(sleeveUrl);
    const cached = this.touchTextureCache(resolved);
    if (cached) {
      return cached;
    }
    try {
      const loader = imageUrlNeedsCrossOrigin(resolved)
        ? new TextureLoader().setCrossOrigin('anonymous')
        : this.textureLoader;
      const texture = await loader.loadAsync(resolved);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);
      texture.flipY = true;
      this.setTextureCache(resolved, texture);
      return texture;
    } catch (error) {
      console.warn('Failed to load sleeve texture:', resolved);
      return this.loadCardBack();
    }
  }

  /**
   * Load the generic card back texture
   */
  async loadCardBack(): Promise<Texture> {
    if (this.cardBackTexture) {
      return this.cardBackTexture;
    }

    try {
      const cardBackUrl = publicAssetUrl('assets/cardback.png');
      const texture = await this.textureLoader.loadAsync(cardBackUrl);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);
      texture.flipY = true;

      this.cardBackTexture = texture;
      return texture;
    } catch (error) {
      console.error('Failed to load card back texture:', error);
      // Create a simple colored texture as ultimate fallback
      return this.createFallbackTexture();
    }
  }

  /**
   * Load a marker texture (for status conditions and card markers)
   */
  async loadMarkerTexture(markerFile: string): Promise<Texture> {
    const markerUrl = publicAssetUrl(`assets/status-conditions/${markerFile}.webp`);

    const cached = this.touchTextureCache(markerUrl);
    if (cached) {
      return cached;
    }

    try {
      const texture = await this.textureLoader.loadAsync(markerUrl);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);

      this.setTextureCache(markerUrl, texture, true);
      return texture;
    } catch (error) {
      console.error('Failed to load marker texture:', markerFile, error);
      return this.createFallbackTexture();
    }
  }

  /**
   * Load the black grid texture for the board surface
   */
  async loadBoardGridTexture(): Promise<Texture> {
    if (this.boardGridTexture) {
      return this.boardGridTexture;
    }

    try {
      const gridUrl = publicAssetUrl('assets/textures/black_grid.png');
      const texture = await this.textureLoader.loadAsync(gridUrl);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);
      texture.flipY = false; // Don't flip for board texture

      // Configure for tiling
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(10, 10); // Tile 10x10 across the 50x50 board

      this.boardGridTexture = texture;
      return texture;
    } catch (error) {
      console.error('Failed to load board grid texture:', error);
      return this.createFallbackTexture();
    }
  }

  /**
   * Load the twinleaf board center texture
   */
  async loadBoardCenterTexture(): Promise<Texture> {
    const centerUrl = publicAssetUrl('assets/twinleaf-board-center.png');

    const cached = this.touchTextureCache(centerUrl);
    if (cached) {
      return cached;
    }

    try {
      const texture = await this.textureLoader.loadAsync(centerUrl);
      texture.colorSpace = 'srgb';
      // Premultiply clears RGB in transparent texels so mipmaps don't form a white/grey halo.
      texture.premultiplyAlpha = true;
      texture.generateMipmaps = true;
      texture.flipY = false;
      this.applyAnisotropy(texture);
      texture.needsUpdate = true;

      this.setTextureCache(centerUrl, texture, true);
      return texture;
    } catch (error) {
      console.error('Failed to load board center texture:', error);
      return this.createFallbackTexture();
    }
  }

  /**
   * Load the card mask texture for rounded corners
   */
  async loadCardMaskTexture(): Promise<Texture> {
    if (this.cardMaskTexture) {
      return this.cardMaskTexture;
    }

    try {
      const maskUrl = publicAssetUrl('assets/3d-card-mask.png');
      const texture = await this.textureLoader.loadAsync(maskUrl);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);
      texture.flipY = true; // Match card texture orientation

      this.cardMaskTexture = texture;
      return texture;
    } catch (error) {
      console.error('Failed to load card mask texture:', error);
      // Return a fallback texture (fully opaque white) so cards still render
      return this.createFallbackTexture();
    }
  }

  /**
   * 2D holo art mask (same assets as 2D CardFace / Angular) for the 3D shader overlay.
   */
  async load2dHoloMaskTexture(variant: HoloVariant): Promise<Texture> {
    const url = holoMaskUrl(variant);
    if (this.holo2dMaskByUrl.has(url)) {
      return this.holo2dMaskByUrl.get(url)!;
    }
    return this.withConcurrencyLimit(async () => {
      try {
        const texture = await this.textureLoader.loadAsync(url);
        texture.colorSpace = SRGBColorSpace;
        this.applyAnisotropy(texture);
        texture.flipY = true;
        this.holo2dMaskByUrl.set(url, texture);
        return texture;
      } catch (e) {
        console.error('Failed to load 2D holo mask:', variant, e);
        return this.loadCardMaskTexture();
      }
    });
  }

  /**
   * Load the aqua grid texture for board slots
   */
  async loadSlotGridTexture(): Promise<Texture> {
    if (this.slotGridTexture) {
      return this.slotGridTexture;
    }

    try {
      const gridUrl = publicAssetUrl('assets/textures/aqua_grid.png');
      const texture = await this.textureLoader.loadAsync(gridUrl);
      texture.colorSpace = 'srgb';
      this.applyAnisotropy(texture);
      texture.flipY = false; // Don't flip for slot texture

      this.slotGridTexture = texture;
      return texture;
    } catch (error) {
      console.error('Failed to load slot grid texture:', error);
      return this.createFallbackTexture();
    }
  }

  /**
   * Create a simple fallback texture
   */
  private createFallbackTexture(): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Draw a simple gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#4a4a4a');
    gradient.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = 'srgb';

    return texture;
  }

  /**
   * Clear texture cache
   */
  clearCache(): void {
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();
    this.pinnedTextureUrls.clear();

    if (this.cardBackTexture) {
      this.cardBackTexture.dispose();
      this.cardBackTexture = null;
    }

    if (this.boardGridTexture) {
      this.boardGridTexture.dispose();
      this.boardGridTexture = null;
    }

    if (this.slotGridTexture) {
      this.slotGridTexture.dispose();
      this.slotGridTexture = null;
    }

    if (this.cardMaskTexture) {
      this.cardMaskTexture.dispose();
      this.cardMaskTexture = null;
    }

    this.holo2dMaskByUrl.forEach((t) => t.dispose());
    this.holo2dMaskByUrl.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.textureCache.size;
  }

  /** Pinned + unpinned texture URLs currently held (for perf instrumentation). */
  getPinnedCacheSize(): number {
    return this.pinnedTextureUrls.size;
  }

  /**
   * Preload card textures in background. Textures land in textureCache for faster
   * display when updateCard/createHandCard runs. Fire-and-forget - does not block.
   */
  preloadCardTextures(urls: string[]): void {
    const uniqueUrls = [...new Set(urls)].filter(
      url => url && url.trim() && !this.textureCache.has(resolveTextureRequestUrl(url)),
    );
    uniqueUrls.forEach(url => {
      this.loadCardTexture(url).catch(() => {});
    });
  }

  /**
   * Preload card textures and wait for completion. Resolves when all loads finish
   * (success or failure). Use for loading screen preload phase.
   */
  async preloadCardTexturesAsync(urls: string[], timeoutMs?: number): Promise<void> {
    const uniqueUrls = [...new Set(urls)].filter(
      url => url && url.trim() && !this.textureCache.has(resolveTextureRequestUrl(url)),
    );
    if (uniqueUrls.length === 0) {
      return;
    }

    const loadAll = Promise.all(
      uniqueUrls.map(url => this.loadCardTexture(url).catch(() => {}))
    );

    if (timeoutMs && timeoutMs > 0) {
      const timeout = new Promise<void>(resolve => setTimeout(() => resolve(), timeoutMs));
      await Promise.race([loadAll, timeout]);
    } else {
      await loadAll;
    }
  }
}
