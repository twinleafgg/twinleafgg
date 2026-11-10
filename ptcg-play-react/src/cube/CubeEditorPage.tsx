import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CubeEditorView } from './CubeEditorView';

export function CubeEditorPage() {
  const { t } = useTranslation();
  const { cubeId } = useParams();

  if (!cubeId) {
    return <p style={{ padding: 20 }}>{t('CUBE_NOT_FOUND')}</p>;
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <CubeEditorView cubeId={cubeId} />
    </div>
  );
}
