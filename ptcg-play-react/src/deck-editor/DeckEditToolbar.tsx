import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from 'ptcg-server';
import { CardTag, Format, SuperType } from 'ptcg-server';
import { CheckboxField } from '../components/ui/CheckboxField';
import { SelectField } from '../components/ui/SelectField';
import { ShellButton } from '../components/ui/ShellButton';
import { ShellButtonLink } from '../components/ui/ShellButtonLink';
import { TextField } from '../components/ui/TextField';
import { useSettings } from '../context/SettingsContext';
import { getDeckFilterTagOptions } from './cardTagI18n';
import { DECK_FORMAT_OPTIONS } from './deckFormatOptions';
import type { DeckEditToolbarFilter } from './types';
import { defaultToolbarFilter } from './types';
import styles from './DeckEditToolbar.module.css';

const SUPER_TYPE_KEYS: { value: SuperType; labelKey: string }[] = [
  { value: SuperType.POKEMON, labelKey: 'LABEL_POKEMON' },
  { value: SuperType.TRAINER, labelKey: 'LABEL_TRAINER' },
  { value: SuperType.ENERGY, labelKey: 'LABEL_ENERGY' },
];

function orderedSetCodes(cards: Card[]): string[] {
  const s = new Set<string>();
  for (const c of cards) {
    if (c.set) {
      s.add(c.set);
    }
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

export type DeckEditToolbarProps = {
  deckName: string;
  filter: DeckEditToolbarFilter;
  onFilterChange: (f: DeckEditToolbarFilter) => void;
  allCards: Card[];
  disabled: boolean;
  isAdmin: boolean;
  saving: boolean;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  customizeTo?: string;
  /** When set, shows Delete (e.g. omit for theme / read-only decks). */
  onDelete?: () => void;
  deleting?: boolean;
};

export function DeckEditToolbar({
  deckName,
  filter,
  onFilterChange,
  allCards,
  disabled,
  isAdmin,
  saving,
  onSave,
  onExport,
  onImport,
  customizeTo,
  onDelete,
  deleting = false,
}: DeckEditToolbarProps) {
  const { t } = useTranslation();
  const { hiddenFormats } = useSettings();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sets = useMemo(() => orderedSetCodes(allCards), [allCards]);
  const superTypes = useMemo(
    () => SUPER_TYPE_KEYS.map((row) => ({ value: row.value, label: t(row.labelKey) })),
    [t],
  );
  const formatOptions = useMemo(
    () =>
      DECK_FORMAT_OPTIONS.filter((row) => !hiddenFormats.includes(row.value)).map((row) => ({
        value: row.value,
        label: t(row.labelKey),
      })),
    [t, hiddenFormats],
  );
  const tagOptions = useMemo(() => getDeckFilterTagOptions(t), [t]);

  function patch(p: Partial<DeckEditToolbarFilter>) {
    onFilterChange({ ...filter, ...p });
  }

  function toggleSuper(t: SuperType) {
    const has = filter.superTypes.includes(t);
    patch({
      superTypes: has ? filter.superTypes.filter((x) => x !== t) : [...filter.superTypes, t],
    });
  }

  return (
    <header className={styles.toolbar}>
      <div className={styles.row}>
        <div className={styles.leftCluster}>
          <TextField
            id="deck-edit-search"
            label={t('DECK_EDIT_SEARCH_CARDS_LABEL')}
            value={filter.searchValue}
            onChange={(e) => patch({ searchValue: e.target.value })}
            disabled={disabled}
            placeholder={t('DECK_EDIT_SEARCH_PLACEHOLDER')}
            autoComplete="off"
            rootClassName={styles.searchDesktop}
            labelClassName={styles.visuallyHidden}
            inputClassName={styles.plainSearchInput}
          />
          <ShellButton
            type="button"
            variant="ghost"
            className={styles.filterToggle}
            onClick={() => setFiltersOpen((v) => !v)}
            disabled={disabled}
          >
            {filtersOpen ? t('DECK_EDIT_HIDE_FILTERS') : t('DECK_EDIT_FILTERS')}
          </ShellButton>
        </div>
        <div className={styles.titleCenter} title={deckName.trim() || t('DECK_TITLE')}>
          <span className={styles.deckTitle}>{deckName.trim() || t('DECK_EDIT_UNTITLED')}</span>
        </div>
        <div className={styles.actions}>
          <ShellButtonLink to="/deck" variant="ghost">
            {t('DECK_EDIT_BACK')}
          </ShellButtonLink>
          {customizeTo ? (
            <ShellButtonLink to={customizeTo} variant="ghost">
              Customize
            </ShellButtonLink>
          ) : null}
          <ShellButton type="button" variant="ghost" onClick={onImport} disabled={disabled}>
            {t('BUTTON_IMPORT')}
          </ShellButton>
          <ShellButton type="button" variant="ghost" onClick={onExport} disabled={disabled}>
            {t('BUTTON_EXPORT')}
          </ShellButton>
          {onDelete ? (
            <ShellButton
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={disabled || deleting}
            >
              {t('BUTTON_DELETE')}
            </ShellButton>
          ) : null}
          <ShellButton type="button" variant="ghost" onClick={onSave} disabled={disabled || saving}>
            {saving ? t('BUTTON_SAVING') : t('BUTTON_SAVE')}
          </ShellButton>
        </div>
      </div>
      <div className={`${styles.filtersPanel} ${filtersOpen ? styles.filtersPanelOpen : ''}`}>
        <div className={styles.filtersInner}>
          <div className={styles.searchMobile}>
            <TextField
              id="deck-edit-search-mobile"
              label={t('DECK_EDIT_SEARCH_CARDS_LABEL')}
              value={filter.searchValue}
              onChange={(e) => patch({ searchValue: e.target.value })}
              disabled={disabled}
              placeholder={t('DECK_EDIT_SEARCH_PLACEHOLDER_LONG')}
              autoComplete="off"
              rootClassName={styles.searchMobile}
              labelClassName={styles.plainSearchLabel}
              inputClassName={styles.plainSearchInput}
            />
          </div>
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>{t('DECK_EDIT_CARD_TYPE_GROUP')}</h3>
            <div className={styles.superRow}>
              {superTypes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.superBtn} ${filter.superTypes.includes(value) ? styles.superBtnActive : ''}`}
                  onClick={() => toggleSuper(value)}
                  disabled={disabled}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>{t('DECK_EDIT_SET_LEGALITY')}</h3>
            <label className={styles.groupTitle} htmlFor="deck-filter-set" style={{ border: 'none', padding: 0 }}>
              {t('DECK_EDIT_SET_LABEL')}
            </label>
            <SelectField
              id="deck-filter-set"
              className={styles.select}
              value={filter.selectedSet ?? ''}
              onChange={(e) => patch({ selectedSet: e.target.value || null })}
              disabled={disabled}
            >
              <option value="">{t('DECK_EDIT_ALL_SETS')}</option>
              {sets.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectField>
            <label className={styles.groupTitle} htmlFor="deck-filter-formats" style={{ marginTop: 10 }}>
              {t('DECK_EDIT_FORMATS_ANY')}
            </label>
            <SelectField
              id="deck-filter-formats"
              multiple
              className={`${styles.select} ${styles.selectMulti}`}
              value={filter.formats.map((f) => String(f))}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value) as Format);
                patch({ formats: selected });
              }}
              disabled={disabled}
            >
              {formatOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>{t('DECK_EDIT_TAGS_ANY')}</h3>
            <SelectField
              id="deck-filter-tags"
              multiple
              className={`${styles.select} ${styles.selectMulti}`}
              value={filter.tags.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value as CardTag);
                patch({ tags: selected });
              }}
              disabled={disabled}
            >
              {tagOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            {isAdmin && (
              <CheckboxField
                id="deck-filter-type-badge"
                className={styles.filterCheckbox}
                checked={filter.showLibraryCardTypeBadge}
                onChange={(e) => patch({ showLibraryCardTypeBadge: e.target.checked })}
                disabled={disabled}
              >
                <span className={styles.adminNote}>{t('DECK_EDIT_SHOW_TYPE_OVERLAY_ADMIN')}</span>
              </CheckboxField>
            )}
            {isAdmin && (
              <button
                type="button"
                className={styles.superBtn}
                style={{ marginTop: 8, width: '100%' }}
                onClick={() => onFilterChange(defaultToolbarFilter())}
                disabled={disabled}
              >
                {t('DECK_EDIT_RESET_FILTERS')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
