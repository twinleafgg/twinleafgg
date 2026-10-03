import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Format } from 'ptcg-server';
import { useSettings } from '../context/SettingsContext';
import {
  BOARD3D_GRAPHICS_TIER_OPTIONS,
  type Board3dGraphicsTier,
} from '../settings/settingsStorage';
import { DECK_FORMAT_OPTIONS } from '../deck-editor/deckFormatOptions';
import { CheckboxField } from '../components/ui/CheckboxField';
import { playSfx } from '../sfx';
import { SettingsCardImagesPanel } from './SettingsCardImagesPanel';
import styles from './SettingsPage.module.css';

type SettingsTabId = 'general' | 'graphics' | 'images';

type GraphicsTierKey =
  | 'board3dGraphicsResolution'
  | 'board3dGraphicsShadows'
  | 'board3dGraphicsTextures';

const GRAPHICS_ROWS: { key: GraphicsTierKey; label: string; hintHighest?: string }[] = [
  {
    key: 'board3dGraphicsResolution',
    label: 'Resolution',
    hintHighest: 'Native display resolution (e.g. full 4K on a 4K monitor). May use more GPU.',
  },
  {
    key: 'board3dGraphicsShadows',
    label: 'Shadows',
  },
  {
    key: 'board3dGraphicsTextures',
    label: 'Textures',
  },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [draft, setDraft] = useState(() => ({
    holoEnabled: s.holoEnabled,
    showCardName: s.showCardName,
    showTags: s.showTags,
    hiddenFormats: [...s.hiddenFormats],
    use3dBoardDefault: s.use3dBoardDefault,
    board2dPerspectiveEnabled: s.board2dPerspectiveEnabled,
    board3dGraphicsResolution: s.board3dGraphicsResolution,
    board3dGraphicsShadows: s.board3dGraphicsShadows,
    board3dGraphicsTextures: s.board3dGraphicsTextures,
    sfxEnabled: s.sfxEnabled,
    debugMarkersEnabled: s.debugMarkersEnabled,
  }));

  function onHiddenFormatsChange(format: Format, isHidden: boolean) {
    setDraft((d) => {
      if (isHidden) {
        if (d.hiddenFormats.includes(format)) {
          return d;
        }
        return { ...d, hiddenFormats: [...d.hiddenFormats, format] };
      }
      return { ...d, hiddenFormats: d.hiddenFormats.filter((f) => f !== format) };
    });
  }

  function isFormatHidden(format: Format): boolean {
    return draft.hiddenFormats.includes(format);
  }

  function setGraphicsTier(key: GraphicsTierKey, tier: Board3dGraphicsTier) {
    setDraft((d) => ({ ...d, [key]: tier }));
  }

  function save() {
    s.commitFromSave({
      holoEnabled: draft.holoEnabled,
      showCardName: draft.showCardName,
      showTags: draft.showTags,
      hiddenFormats: draft.hiddenFormats,
      use3dBoardDefault: draft.use3dBoardDefault,
      board2dPerspectiveEnabled: draft.board2dPerspectiveEnabled,
      board3dGraphicsResolution: draft.board3dGraphicsResolution,
      board3dGraphicsShadows: draft.board3dGraphicsShadows,
      board3dGraphicsTextures: draft.board3dGraphicsTextures,
      sfxEnabled: draft.sfxEnabled,
      debugMarkersEnabled: draft.debugMarkersEnabled,
      sfxVolumePercent: Math.round(s.sfxVolume * 100),
      cardSize: s.cardSize,
      cardTextKerning: s.cardTextKerning,
    });
    navigate(-1);
  }

  const sfxPercent = Math.round(s.sfxVolume * 100);
  const showSaveActions = activeTab === 'general' || activeTab === 'graphics';

  return (
    <div className={styles.page}>
      <div className={styles.cornerTL} aria-hidden />
      <div className={styles.cornerBR} aria-hidden />
      <div className={styles.dots} aria-hidden />

      <div className={styles.scroll}>
        <div className={styles.contentWrap}>
      <h1 className={styles.title}>Settings</h1>

      <nav className={styles.tabNavContainer} aria-label="Settings">
        <div className={styles.tabNav} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'general'}
            className={`${styles.tabButton} ${activeTab === 'general' ? styles.tabButtonActive : ''}`}
            onClick={() => {
              playSfx('uiButton');
              setActiveTab('general');
            }}
          >
            General
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'graphics'}
            className={`${styles.tabButton} ${activeTab === 'graphics' ? styles.tabButtonActive : ''}`}
            onClick={() => {
              playSfx('uiButton');
              setActiveTab('graphics');
            }}
          >
            Graphics
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'images'}
            className={`${styles.tabButton} ${activeTab === 'images' ? styles.tabButtonActive : ''}`}
            onClick={() => {
              playSfx('uiButton');
              setActiveTab('images');
            }}
          >
            {t('PROFILE_CHANGE_CARD_IMAGES')}
          </button>
        </div>
      </nav>

      {activeTab === 'general' ? (
        <div className={styles.content} role="tabpanel">
          <CheckboxField
            plain
            className={styles.row}
            checked={draft.holoEnabled}
            onChange={(e) => setDraft((d) => ({ ...d, holoEnabled: e.target.checked }))}
          >
            Enable Holo Effects
          </CheckboxField>
          <CheckboxField
            plain
            className={styles.row}
            checked={draft.showCardName}
            onChange={(e) => setDraft((d) => ({ ...d, showCardName: e.target.checked }))}
          >
            Show Card Names
          </CheckboxField>
          <CheckboxField
            plain
            className={styles.row}
            checked={draft.showTags}
            onChange={(e) => setDraft((d) => ({ ...d, showTags: e.target.checked }))}
          >
            Show Tags
          </CheckboxField>
          <CheckboxField
            plain
            className={styles.row}
            checked={draft.debugMarkersEnabled}
            onChange={(e) => setDraft((d) => ({ ...d, debugMarkersEnabled: e.target.checked }))}
          >
            Debug Markers Turned On
          </CheckboxField>
          <CheckboxField
            plain
            className={styles.row}
            checked={!draft.use3dBoardDefault}
            onChange={(e) => setDraft((d) => ({ ...d, use3dBoardDefault: !e.target.checked }))}
          >
            Use 2D Game Board
          </CheckboxField>
          <CheckboxField
            plain
            className={styles.row}
            checked={draft.board2dPerspectiveEnabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, board2dPerspectiveEnabled: e.target.checked }))
            }
          >
            2D Board Perspective
          </CheckboxField>

          <div className={styles.sliderBlock}>
            <label htmlFor="settings-card-size">Card Size</label>
            <input
              id="settings-card-size"
              type="range"
              min={50}
              max={200}
              step={10}
              value={s.cardSize}
              onChange={(e) => s.setCardSize(parseInt(e.target.value, 10))}
            />
            <span className={styles.sliderValue}>{s.cardSize}%</span>
          </div>

          <div className={styles.sliderBlock}>
            <label htmlFor="settings-kerning">Card Text Kerning</label>
            <input
              id="settings-kerning"
              type="range"
              min={-2}
              max={4}
              step={0.1}
              value={s.cardTextKerning}
              onChange={(e) => s.setCardTextKerning(parseFloat(e.target.value))}
            />
            <span className={styles.sliderValue}>{s.cardTextKerning.toFixed(1)}px</span>
          </div>

          <CheckboxField
            plain
            className={styles.row}
            checked={draft.sfxEnabled}
            onChange={(e) => setDraft((d) => ({ ...d, sfxEnabled: e.target.checked }))}
          >
            Sound Effects
          </CheckboxField>

          <div className={styles.sliderBlock}>
            <label htmlFor="settings-sfx-vol">Sound Effects Volume</label>
            <input
              id="settings-sfx-vol"
              type="range"
              min={0}
              max={100}
              step={5}
              value={sfxPercent}
              onChange={(e) => s.setSfxVolume(parseInt(e.target.value, 10) / 100)}
            />
            <span className={styles.sliderValue}>{sfxPercent}%</span>
          </div>

          <div className={styles.hiddenFormats}>
            <span className={styles.sectionLabel}>Hidden Formats</span>
            <div className={styles.formatList}>
              {DECK_FORMAT_OPTIONS.map(({ value, labelKey }) => (
                <CheckboxField
                  key={value}
                  plain
                  checked={isFormatHidden(value)}
                  onChange={(e) => onHiddenFormatsChange(value, e.target.checked)}
                >
                  {t(labelKey)}
                </CheckboxField>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'graphics' ? (
        <div className={styles.content} role="tabpanel">
          <p className={styles.graphicsIntro}>
            Adjust each option independently for the 3D game board.
          </p>
          {GRAPHICS_ROWS.map((row) => {
            const value = draft[row.key];
            return (
              <div key={row.key} className={styles.graphicsRow}>
                <span className={styles.graphicsRowLabel} id={`graphics-${row.key}-label`}>
                  {row.label}
                </span>
                <div
                  className={styles.tierGroup}
                  role="group"
                  aria-labelledby={`graphics-${row.key}-label`}
                >
                  {BOARD3D_GRAPHICS_TIER_OPTIONS.map((opt) => {
                    const active = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.tierButton}${active ? ` ${styles.tierButtonActive}` : ''}`}
                        aria-pressed={active}
                        onClick={() => {
                          playSfx('uiButton');
                          setGraphicsTier(row.key, opt.value);
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {row.hintHighest && value === 'highest' ? (
                  <p className={styles.hint}>{row.hintHighest}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div role="tabpanel">
          <SettingsCardImagesPanel />
        </div>
      )}

      {showSaveActions ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              playSfx('uiButton');
              navigate(-1);
            }}
          >
            {t('BUTTON_CANCEL')}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              playSfx('uiButton');
              save();
            }}
          >
            {t('BUTTON_SAVE')}
          </button>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}
