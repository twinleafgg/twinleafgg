import { Scene, Vector3, Texture, PerspectiveCamera, Group, Object3D } from 'three';
import {
  PokemonCardList,
  Card,
  CardList,
  BoardEffect,
  SuperType,
  type CardTarget,
} from 'ptcg-server';
import { Board3dCard } from '../board-3d-card';
import { Board3dAssetLoaderService } from './board-3d-asset-loader.service';
import { Board3dEnergySprite } from '../board-3d-energy-sprite';
import { Board3dDamageCounter } from '../board-3d-damage-counter';
import { Board3dPendingPlaceDamage } from '../board-3d-pending-place-damage';
import { Board3dMarker, collectPokemonMarkerFiles } from '../board-3d-marker';
import { Board3dAbilityUsedBadge } from '../board-3d-ability-used-badge';
import type { Board3dCardsAdapter } from '../board3dCardsAdapter';
import { apply3dCardHolo } from '../board-3d-holo-apply';
import {
  configureToolCardHitTarget,
  disposeToolCardHitTarget,
  refreshToolCardHitTarget,
} from '../board-3d-tool-hit';
import {
  LEGEND_3D_BOTTOM_Z,
  LEGEND_3D_HALF_ROTATION,
  LEGEND_3D_HALF_SCALE,
  LEGEND_3D_TOP_Z,
  LEGEND_3D_Y,
  resolveLegendDisplayHalves,
} from '../legend-display.utils';

function overlayAttachRoot(host: Board3dCard | Group): Group {
  return host instanceof Board3dCard ? host.getGroup() : host;
}

/** Overlays that stick to the card face and tilt with special conditions. */
function cardOverlayAttachRoot(host: Board3dCard | Group): Object3D {
  return host instanceof Board3dCard ? host.getOverlayAnchor() : host;
}

export interface CardOverlays {
  energySprite: Board3dEnergySprite;
  damageCounter: Board3dDamageCounter;
  pendingPlaceDamage: Board3dPendingPlaceDamage;
  marker: Board3dMarker;
  abilityUsedBadge: Board3dAbilityUsedBadge;
  breakCard?: Board3dCard;
  legendTopCard?: Board3dCard;
  legendBottomCard?: Board3dCard;
  toolCards: Board3dCard[];
  /** Signature of last built tool list (ids/names) to skip rebuilds. */
  toolSignature?: string;
}

export class Board3dCardOverlayService {
  private cardOverlays: Map<string, CardOverlays> = new Map();
  private energyTextureCache: Map<string, Texture> = new Map();
  /** Host mesh id → energy slot index hidden while attach flight morphs into place. */
  private suppressedEnergyIconSlots = new Map<string, number>();

  constructor(
    private assetLoader: Board3dAssetLoaderService,
    private cardsAdapter: Board3dCardsAdapter
  ) { }

  async updateOverlays(
    cardId: string,
    cardList: PokemonCardList,
    cardHost: Board3dCard | Group,
    breakCard: Card | undefined,
    isFaceDown: boolean,
    scene: Scene,
    pendingPlaceDamage: number = 0,
  ): Promise<void> {
    const root = overlayAttachRoot(cardHost);
    const overlayRoot = cardOverlayAttachRoot(cardHost);
    let overlays = this.cardOverlays.get(cardId);
    if (!overlays) {
      overlays = {
        energySprite: new Board3dEnergySprite(),
        damageCounter: new Board3dDamageCounter(),
        pendingPlaceDamage: new Board3dPendingPlaceDamage(),
        marker: new Board3dMarker(this.assetLoader),
        abilityUsedBadge: new Board3dAbilityUsedBadge(),
        toolCards: [],
      };
      this.cardOverlays.set(cardId, overlays);
      overlays.energySprite.attachTo(overlayRoot);
      overlays.damageCounter.attachTo(overlayRoot);
      root.add(overlays.pendingPlaceDamage.getGroup());
      overlays.marker.attachTo(overlayRoot);
      root.add(overlays.abilityUsedBadge.getGroup());
    } else {
      overlays.energySprite.attachTo(overlayRoot);
      overlays.damageCounter.attachTo(overlayRoot);
      overlays.marker.attachTo(overlayRoot);
    }

    if (cardHost instanceof Board3dCard) {
      cardHost.setSpecialConditionRotation(cardList.specialConditions);
    }

    if (cardList.energies && cardList.energies.cards.length > 0) {
      await this.updateEnergyOverlay(overlays, cardList.energies, cardId);
    } else {
      overlays.energySprite.clear();
    }

    overlays.damageCounter.updateDamage(cardList.damage, {
      deferAppearAnimation: !root.visible,
    });
    overlays.pendingPlaceDamage.update(pendingPlaceDamage);

    await overlays.marker.updateForCard(cardList);

    const hasAbilityUsed = cardList.boardEffect.includes(BoardEffect.ABILITY_USED);
    overlays.abilityUsedBadge.updateAbilityUsed(hasAbilityUsed);

    await this.updateBreakOverlay(cardId, overlays, root, breakCard, isFaceDown, scene, cardList);
    const { top: legendTop, bottom: legendBottom } = resolveLegendDisplayHalves(cardList);
    await this.updateLegendOverlay(
      overlays,
      root,
      legendTop,
      legendBottom,
      isFaceDown,
      cardList,
      cardHost,
    );
    await this.updateToolOverlay(cardId, overlays, cardList.tools, root, scene, cardList);
  }

  setSuppressedEnergyIconSlot(hostMeshId: string, energyIndex: number): void {
    this.suppressedEnergyIconSlots.set(hostMeshId, energyIndex);
  }

  clearSuppressedEnergyIconSlot(hostMeshId: string): void {
    this.suppressedEnergyIconSlots.delete(hostMeshId);
  }

  async loadEnergyIconTexture(card: Card, energyCardList: CardList): Promise<Texture> {
    const key = this.energyTextureKey(card, energyCardList);
    if (key) {
      if (!this.energyTextureCache.has(key)) {
        try {
          const texture = await this.assetLoader.loadCardTexture(key);
          this.energyTextureCache.set(key, texture);
        } catch {
          return this.assetLoader.loadCardBack();
        }
      }
      return this.energyTextureCache.get(key)!;
    }
    return this.assetLoader.loadCardBack();
  }

  private energyTextureKey(card: Card, energyCardList: CardList): string | null {
    const custom = Board3dEnergySprite.getEnergyIconPath(card);
    if (custom) {
      return custom;
    }
    if (card.superType === SuperType.ENERGY) {
      const scan = this.cardsAdapter.getScanUrlFor3D(card, energyCardList);
      return scan?.trim() || null;
    }
    return null;
  }

  private async updateEnergyOverlay(
    overlays: CardOverlays,
    energyCardList: CardList,
    cardId?: string,
  ): Promise<void> {
    if (!energyCardList || energyCardList.cards.length === 0) {
      return;
    }

    const cardBackTexture = await this.assetLoader.loadCardBack();

    for (const card of energyCardList.cards) {
      const key = this.energyTextureKey(card, energyCardList);
      if (key && !this.energyTextureCache.has(key)) {
        try {
          const texture = await this.assetLoader.loadCardTexture(key);
          this.energyTextureCache.set(key, texture);
        } catch {
          // Use card back as fallback in updateEnergies
        }
      }
    }

    overlays.energySprite.updateEnergies(
      energyCardList.cards,
      energyCardList,
      this.energyTextureCache,
      cardBackTexture,
      (c) => this.energyTextureKey(c, energyCardList),
      cardId != null ? (this.suppressedEnergyIconSlots.get(cardId) ?? -1) : -1,
    );
  }

  async refreshEnergyOverlayForCard(cardId: string, energyCardList: CardList): Promise<void> {
    const overlays = this.cardOverlays.get(cardId);
    if (!overlays || !energyCardList || energyCardList.cards.length === 0) {
      return;
    }
    await this.updateEnergyOverlay(overlays, energyCardList, cardId);
  }

  updateBillboards(camera: PerspectiveCamera): void {
    this.cardOverlays.forEach((overlays) => {
      overlays.energySprite.updateBillboards(camera);
      overlays.damageCounter.updateBillboards(camera);
      overlays.marker.updateBillboards(camera);
    });
  }

  /** Lightweight refresh when Put damage placement preview changes (no full card sync). */
  updatePendingPlaceDamageOnly(cardId: string, pendingPlaceDamage: number): void {
    cardId = String(cardId);
    const overlays = this.cardOverlays.get(cardId);
    if (!overlays) {
      return;
    }
    overlays.pendingPlaceDamage.update(pendingPlaceDamage);
  }

  private async updateBreakOverlay(
    cardId: string,
    overlays: CardOverlays,
    attachRoot: Group,
    breakCard: Card | undefined,
    isFaceDown: boolean,
    scene: Scene,
    cardList?: PokemonCardList
  ): Promise<void> {
    if (breakCard && !isFaceDown) {
      const breakScanUrl = this.cardsAdapter.getScanUrlFor3D(breakCard, cardList);

      const loadBreakTexture = async () => {
        if (!breakScanUrl || !breakScanUrl.trim()) {
          console.warn('Empty scanUrl for BREAK card:', breakCard?.fullName, 'set:', breakCard?.set, 'setNumber:', breakCard?.setNumber);
          return this.assetLoader.loadCardBack();
        }
        try {
          return await this.assetLoader.loadCardTexture(breakScanUrl);
        } catch (error) {
          console.error('Failed to load BREAK card texture:', breakScanUrl, error);
          return this.assetLoader.loadCardBack();
        }
      };

      const [breakFrontTexture, breakBackTexture, maskTexture] = await Promise.all([
        loadBreakTexture(),
        this.assetLoader.loadCardBack(),
        this.assetLoader.loadCardMaskTexture()
      ]);

      if (!overlays.breakCard) {
        overlays.breakCard = new Board3dCard(
          breakFrontTexture,
          breakBackTexture,
          new Vector3(0, 0.05, 0),
          0,
          1.0,
          maskTexture
        );
        attachRoot.add(overlays.breakCard.getGroup());
      } else {
        overlays.breakCard.updateTexture(breakFrontTexture, breakBackTexture, maskTexture);
      }
      void apply3dCardHolo(this.assetLoader, overlays.breakCard, breakCard, false);
    } else if (overlays.breakCard) {
      attachRoot.remove(overlays.breakCard.getGroup());
      overlays.breakCard.dispose();
      overlays.breakCard = undefined;
    }
  }

  private hostCardTarget(cardHost: Board3dCard | Group): CardTarget | undefined {
    const group = cardHost instanceof Board3dCard ? cardHost.getGroup() : cardHost;
    return group.userData.cardTarget as CardTarget | undefined;
  }

  private async updateLegendOverlay(
    overlays: CardOverlays,
    attachRoot: Group,
    legendTop: Card | undefined,
    legendBottom: Card | undefined,
    isFaceDown: boolean,
    cardList: PokemonCardList,
    cardHost: Board3dCard | Group,
  ): Promise<void> {
    const hostTarget = this.hostCardTarget(cardHost);
    overlays.legendTopCard = await this.syncLegendHalfOverlay(
      overlays.legendTopCard,
      legendTop && !isFaceDown ? legendTop : undefined,
      attachRoot,
      new Vector3(0, LEGEND_3D_Y, LEGEND_3D_TOP_Z),
      cardList,
      hostTarget,
    );
    overlays.legendBottomCard = await this.syncLegendHalfOverlay(
      overlays.legendBottomCard,
      legendBottom && !isFaceDown ? legendBottom : undefined,
      attachRoot,
      new Vector3(0, LEGEND_3D_Y + 0.01, LEGEND_3D_BOTTOM_Z),
      cardList,
      hostTarget,
    );
  }

  private async syncLegendHalfOverlay(
    existing: Board3dCard | undefined,
    card: Card | undefined,
    attachRoot: Group,
    position: Vector3,
    cardList: PokemonCardList,
    hostTarget: CardTarget | undefined,
  ): Promise<Board3dCard | undefined> {
    if (!card) {
      if (existing) {
        attachRoot.remove(existing.getGroup());
        existing.dispose();
      }
      return undefined;
    }

    const scanUrl = this.cardsAdapter.getScanUrlFor3D(card, cardList);
    const loadFrontTexture = async () => {
      if (!scanUrl?.trim()) {
        return this.assetLoader.loadCardBack();
      }
      try {
        return await this.assetLoader.loadCardTexture(scanUrl);
      } catch {
        return this.assetLoader.loadCardBack();
      }
    };

    const [frontTexture, backTexture, maskTexture] = await Promise.all([
      loadFrontTexture(),
      this.assetLoader.loadCardBack(),
      this.assetLoader.loadCardMaskTexture(),
    ]);

    let mesh = existing;
    if (!mesh) {
      mesh = new Board3dCard(
        frontTexture,
        backTexture,
        position,
        LEGEND_3D_HALF_ROTATION,
        LEGEND_3D_HALF_SCALE,
        maskTexture,
      );
      const group = mesh.getGroup();
      group.userData.cardData = card;
      group.userData.cardList = cardList;
      group.userData.isLegendHalf = true;
      if (hostTarget) {
        group.userData.cardTarget = hostTarget;
      }
      group.renderOrder = 120;
      mesh.getMesh().renderOrder = 120;
      attachRoot.add(group);
    } else {
      mesh.setPosition(position);
      mesh.setRotation(LEGEND_3D_HALF_ROTATION);
      mesh.setScale(LEGEND_3D_HALF_SCALE);
      mesh.updateTexture(frontTexture, backTexture, maskTexture);
      const group = mesh.getGroup();
      group.userData.cardData = card;
      group.userData.cardList = cardList;
      if (hostTarget) {
        group.userData.cardTarget = hostTarget;
      }
    }

    void apply3dCardHolo(this.assetLoader, mesh, card, false);
    return mesh;
  }

  private async updateToolOverlay(
    cardId: string,
    overlays: CardOverlays,
    tools: Card[],
    attachRoot: Group,
    scene: Scene,
    cardList?: PokemonCardList
  ): Promise<void> {
    const toolSignature = tools.map((t) => `${t.id}:${t.fullName}`).join('|');
    if (toolSignature === overlays.toolSignature) {
      return;
    }

    for (const toolCard of overlays.toolCards) {
      disposeToolCardHitTarget(toolCard.getGroup());
      attachRoot.remove(toolCard.getGroup());
      toolCard.dispose();
    }
    overlays.toolCards = [];
    overlays.toolSignature = toolSignature;

    if (tools.length === 0) {
      return;
    }

    const [backTexture, maskTexture] = await Promise.all([
      this.assetLoader.loadCardBack(),
      this.assetLoader.loadCardMaskTexture()
    ]);

    const customToolIcons: { [key: string]: string } = {
      'Vitality Band': 'assets/tools/vitality-band.png',
      'Bravery Charm': 'assets/tools/bravery-charm.png',
    };

    const baseX = 0;
    const baseY = -0.02;
    const baseZ = -0.75;
    const verticalSpacing = 0.05;

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];

      let toolTexture: Texture;
      const customIconPath = customToolIcons[tool.name];
      if (customIconPath) {
        try {
          toolTexture = await this.assetLoader.loadToolIconTexture(customIconPath);
        } catch (error) {
          const toolScanUrl = this.cardsAdapter.getScanUrlFor3D(tool, cardList);
          if (!toolScanUrl || !toolScanUrl.trim()) {
            console.warn('Empty scanUrl for tool card:', tool?.fullName, 'set:', tool?.set, 'setNumber:', tool?.setNumber);
            toolTexture = await this.assetLoader.loadCardBack();
          } else {
            try {
              toolTexture = await this.assetLoader.loadCardTexture(toolScanUrl);
            } catch (textureError) {
              console.error('Failed to load tool card texture:', toolScanUrl, textureError);
              toolTexture = await this.assetLoader.loadCardBack();
            }
          }
        }
      } else {
        const toolScanUrl = this.cardsAdapter.getScanUrlFor3D(tool, cardList);
        if (!toolScanUrl || !toolScanUrl.trim()) {
          console.warn('Empty scanUrl for tool card:', tool?.fullName, 'set:', tool?.set, 'setNumber:', tool?.setNumber);
          toolTexture = await this.assetLoader.loadCardBack();
        } else {
          try {
            toolTexture = await this.assetLoader.loadCardTexture(toolScanUrl);
          } catch (error) {
            console.error('Failed to load tool card texture:', toolScanUrl, error);
            toolTexture = await this.assetLoader.loadCardBack();
          }
        }
      }

      const toolCardMesh = new Board3dCard(
        toolTexture,
        backTexture,
        new Vector3(baseX, baseY + (i * 0.01), baseZ - (i * verticalSpacing)),
        0,
        1.0,
        maskTexture
      );

      const toolCardList = new CardList();
      toolCardList.cards = [tool];
      toolCardList.isPublic = true;
      toolCardMesh.getGroup().userData.isToolCard = true;
      toolCardMesh.getGroup().userData.cardData = tool;
      toolCardMesh.getGroup().userData.cardList = toolCardList;

      toolCardMesh.getGroup().renderOrder = 150;
      toolCardMesh.getMesh().renderOrder = 150;

      const centerZInHost = baseZ - i * verticalSpacing;
      configureToolCardHitTarget(toolCardMesh, centerZInHost, 1.0);

      attachRoot.add(toolCardMesh.getGroup());
      overlays.toolCards.push(toolCardMesh);
      void apply3dCardHolo(this.assetLoader, toolCardMesh, tool, false).then(() => {
        refreshToolCardHitTarget(toolCardMesh);
      });
    }
  }

  rekeyOverlays(oldId: string, newId: string): void {
    const overlays = this.cardOverlays.get(oldId);
    if (!overlays) {
      return;
    }
    this.cardOverlays.delete(oldId);
    this.cardOverlays.set(newId, overlays);
  }

  clearOverlays(cardId: string, scene: Scene): void {
    const overlays = this.cardOverlays.get(cardId);
    if (overlays) {
      overlays.energySprite.dispose();
      overlays.damageCounter.dispose();
      overlays.pendingPlaceDamage.dispose();
      overlays.marker.dispose();
      overlays.abilityUsedBadge.dispose();
      if (overlays.breakCard) {
        overlays.breakCard.dispose();
      }
      if (overlays.legendTopCard) {
        overlays.legendTopCard.dispose();
      }
      if (overlays.legendBottomCard) {
        overlays.legendBottomCard.dispose();
      }
      for (const toolCard of overlays.toolCards) {
        toolCard.dispose();
      }
      this.cardOverlays.delete(cardId);
    }
  }

  dispose(scene: Scene): void {
    this.cardOverlays.forEach((_, cardId) => {
      this.clearOverlays(cardId, scene);
    });
    this.cardOverlays.clear();
    // Textures are owned by the asset loader cache — do not dispose them here.
    this.energyTextureCache.clear();
  }
}
