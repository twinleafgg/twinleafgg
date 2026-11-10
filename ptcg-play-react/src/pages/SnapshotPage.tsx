import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayFromSnapshotDialog } from '../games/PlayFromSnapshotDialog';

/** Deep link: /snapshot/:code opens Play Both Sides from a shared state. */
export function SnapshotPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [code]);

  return (
    <PlayFromSnapshotDialog
      open={open}
      initialCode={code ?? ''}
      autoPlay
      onClose={() => {
        setOpen(false);
        navigate('/games');
      }}
    />
  );
}
