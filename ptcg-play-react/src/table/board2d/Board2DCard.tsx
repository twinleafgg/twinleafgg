import { useMemo, type CSSProperties, type MouseEvent } from 'react';
import type { Card, CardList, CardTarget, PokemonCardList } from 'ptcg-server';
import { CardFace } from '../../components/cards/CardFace';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { cn } from '../../utils/cn';
import { getCustomEnergyIconPath } from '../board3d/energy-icons.utils';
import {
  BoardEffect,
  SpecialCondition,
  buildBoard2dCardModel,
} from './board2dCardModel';
import styles from './Board2DCard.module.css';

const TOOL_ICONS: Record<string, string> = {
  'Vitality Band': 'assets/tools/vitality-band.png',
  'Bravery Charm': 'assets/tools/bravery-charm.png',
};

export type Board2DCardProps = {
  cardList?: CardList | PokemonCardList | null;
  owner: boolean;
  faceDown?: boolean;
  showCardCount?: boolean;
  scanUrl: (card: Card, list?: CardList | PokemonCardList | null) => string;
  sleeveUrl?: string;
  selectable?: boolean;
  selected?: boolean;
  attachTarget?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: (card: Card | undefined, cardList: CardList | PokemonCardList | null | undefined) => void;
  onContextMenu?: (card: Card | undefined, cardList: CardList | PokemonCardList | null | undefined) => void;
  onEnergyClick?: (card: Card) => void;
  onToolClick?: (card: Card) => void;
  cardTarget?: CardTarget;
  /** Extra HP being placed during Put damage prompt (preview before OK). */
  pendingPlaceDamage?: number;
};

export function Board2DCard({
  cardList,
  owner,
  faceDown = false,
  showCardCount = false,
  scanUrl,
  sleeveUrl,
  selectable = false,
  selected = false,
  attachTarget = false,
  className,
  style,
  onClick,
  onContextMenu,
  onEnergyClick,
  onToolClick,
  pendingPlaceDamage = 0,
}: Board2DCardProps) {
  const model = useMemo(
    () => buildBoard2dCardModel(cardList, owner, faceDown),
    [cardList, owner, faceDown],
  );

  const cardbackStyle = useMemo((): CSSProperties | undefined => {
    if (!sleeveUrl && !model.isFaceDown) {
      return undefined;
    }
    const url = sleeveUrl || publicAssetUrl('assets/cardback.png');
    return { ['--cardback-url' as string]: `url(${url})` };
  }, [sleeveUrl, model.isFaceDown]);

  const cond = model.specialConditions;
  const showLegendStack = !!(model.legendTopCard && model.legendBottomCard);
  const showVunionStack = !!(
    model.vunionTopLeftCard &&
    model.vunionTopRightCard &&
    model.vunionBottomLeftCard &&
    model.vunionBottomRightCard
  );
  const classNames = cn(
    styles.card,
    model.isEmpty && styles.empty,
    model.isFaceDown && styles.faceDown,
    model.stadiumDirectionDown && styles.upsideDown,
    selectable && styles.selectable,
    selected && styles.selected,
    attachTarget && styles.attachTarget,
    cond.includes(SpecialCondition.ASLEEP) && styles.asleep,
    cond.includes(SpecialCondition.CONFUSED) && styles.confused,
    cond.includes(SpecialCondition.PARALYZED) && styles.paralyzed,
    className,
  );

  function handleMainClick(e: MouseEvent) {
    // Only consume the event when this card has its own handler. Board slots
    // put click/context-menu on the parent DraggableBoardCard wrapper.
    if (!onClick) {
      return;
    }
    e.stopPropagation();
    onClick(
      model.mainCard ??
        model.legendTopCard ??
        model.legendBottomCard ??
        model.vunionTopLeftCard ??
        model.dualStadiumLeftCard,
      cardList,
    );
  }

  function handleContextMenu(e: MouseEvent) {
    if (!onContextMenu || model.isEmpty) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(model.mainCard ?? model.dualStadiumLeftCard, cardList);
  }

  function handleLegendClick(e: MouseEvent, card: Card) {
    if (!onClick) {
      return;
    }
    e.stopPropagation();
    onClick(card, cardList);
  }

  if (model.dualStadiumLeftCard && model.dualStadiumRightCard) {
    return (
      <div
        className={classNames}
        style={{ ...style, ...cardbackStyle }}
        onClick={handleMainClick}
        onContextMenu={handleContextMenu}
      >
        <div className={styles.dualStadium}>
          <CardFace
            className={styles.dualHalf}
            src={scanUrl(model.dualStadiumLeftCard, cardList)}
            card={model.dualStadiumLeftCard}
            name={model.dualStadiumLeftCard.name}
          />
          <CardFace
            className={styles.dualHalf}
            src={scanUrl(model.dualStadiumRightCard, cardList)}
            card={model.dualStadiumRightCard}
            name={model.dualStadiumRightCard.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames}
      style={{ ...style, ...cardbackStyle }}
      onClick={handleMainClick}
      onContextMenu={handleContextMenu}
    >
      {!model.isFaceDown && model.energyCards.length > 0 ? (
        <div className={styles.energyRow}>
          {model.energyCards.map((energy, i) => {
            const custom = getCustomEnergyIconPath(energy, true);
            const src = custom ? publicAssetUrl(custom) : scanUrl(energy, cardList);
            return (
              <div
                key={`${energy.id}-${i}`}
                className={styles.energyIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  onEnergyClick?.(energy);
                }}
              >
                <CardFace src={src} name={energy.name} card={energy} holoEnabled={false} />
              </div>
            );
          })}
        </div>
      ) : null}

      {model.moreEnergies > 0 ? (
        <div className={styles.energyMore}>+{model.moreEnergies}</div>
      ) : null}

      {model.breakCard ? (
        <div className={styles.breakCard}>
          <CardFace
            src={scanUrl(model.breakCard, cardList)}
            card={model.breakCard}
            name={model.breakCard.name}
          />
        </div>
      ) : null}

      {model.legendTopCard ? (
        <div
          className={styles.legendTopCard}
          onClick={(e) => handleLegendClick(e, model.legendTopCard!)}
        >
          <CardFace
            src={scanUrl(model.legendTopCard, cardList)}
            card={model.legendTopCard}
            name={model.legendTopCard.name}
          />
        </div>
      ) : null}

      {model.legendBottomCard ? (
        <div
          className={styles.legendBottomCard}
          onClick={(e) => handleLegendClick(e, model.legendBottomCard!)}
        >
          <CardFace
            src={scanUrl(model.legendBottomCard, cardList)}
            card={model.legendBottomCard}
            name={model.legendBottomCard.name}
          />
        </div>
      ) : null}

      {model.vunionTopLeftCard ? (
        <div
          className={styles.vunionTopLeft}
          onClick={(e) => handleLegendClick(e, model.vunionTopLeftCard!)}
        >
          <CardFace
            src={scanUrl(model.vunionTopLeftCard, cardList)}
            card={model.vunionTopLeftCard}
            name={model.vunionTopLeftCard.name}
          />
        </div>
      ) : null}
      {model.vunionTopRightCard ? (
        <div
          className={styles.vunionTopRight}
          onClick={(e) => handleLegendClick(e, model.vunionTopRightCard!)}
        >
          <CardFace
            src={scanUrl(model.vunionTopRightCard, cardList)}
            card={model.vunionTopRightCard}
            name={model.vunionTopRightCard.name}
          />
        </div>
      ) : null}
      {model.vunionBottomLeftCard ? (
        <div
          className={styles.vunionBottomLeft}
          onClick={(e) => handleLegendClick(e, model.vunionBottomLeftCard!)}
        >
          <CardFace
            src={scanUrl(model.vunionBottomLeftCard, cardList)}
            card={model.vunionBottomLeftCard}
            name={model.vunionBottomLeftCard.name}
          />
        </div>
      ) : null}
      {model.vunionBottomRightCard ? (
        <div
          className={styles.vunionBottomRight}
          onClick={(e) => handleLegendClick(e, model.vunionBottomRightCard!)}
        >
          <CardFace
            src={scanUrl(model.vunionBottomRightCard, cardList)}
            card={model.vunionBottomRightCard}
            name={model.vunionBottomRightCard.name}
          />
        </div>
      ) : null}

      {!model.isEmpty &&
      !model.isFaceDown &&
      model.mainCard &&
      !showLegendStack &&
      !showVunionStack ? (
        <CardFace
          className={styles.mainFace}
          src={scanUrl(model.mainCard, cardList)}
          card={model.mainCard}
          name={model.mainCard.name}
          draggable={false}
        />
      ) : null}

      {!model.isFaceDown && model.tools.length > 0 ? (
        <div className={styles.toolCards}>
          {model.tools.map((tool, i) => {
            const custom = TOOL_ICONS[tool.name];
            const src = custom ? publicAssetUrl(custom) : scanUrl(tool, cardList);
            return (
              <div
                key={`${tool.id}-tool-${i}`}
                className={styles.toolIcon}
                style={{ top: `calc(20% + ${i * 15}px)` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToolClick?.(tool);
                }}
              >
                <CardFace src={src} name={tool.name} card={tool} holoEnabled={false} />
              </div>
            );
          })}
        </div>
      ) : null}

      {model.damage > 0 ? <div className={styles.damage}>{model.damage}</div> : null}
      {pendingPlaceDamage > 0 ? (
        <div className={styles.pendingPlaceDamage}>+{pendingPlaceDamage}</div>
      ) : null}

      {cond.includes(SpecialCondition.POISONED) ? (
        <div className={cn(styles.marker, styles.poison)} />
      ) : null}
      {cond.includes(SpecialCondition.PARALYZED) ? (
        <div className={cn(styles.marker, styles.paralyzedMarker)} />
      ) : null}
      {cond.includes(SpecialCondition.CONFUSED) ? (
        <div className={cn(styles.marker, styles.confusedMarker)} />
      ) : null}
      {cond.includes(SpecialCondition.ASLEEP) ? (
        <div className={cn(styles.marker, styles.asleepMarker)} />
      ) : null}
      {cond.includes(SpecialCondition.BURNED) ? (
        <div className={cn(styles.marker, styles.burnedMarker)} />
      ) : null}
      {model.hasImprisonMarker ? (
        <div className={cn(styles.marker, styles.imprisonMarker)} />
      ) : null}

      {model.boardEffect.includes(BoardEffect.ABILITY_USED) ? (
        <div className={styles.abilityUsed}>Ability Used</div>
      ) : null}

      {showCardCount && model.cardCount > 0 ? (
        <div className={styles.cardCounts}>{model.cardCount}</div>
      ) : null}
    </div>
  );
}
