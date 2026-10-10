import { DownloadShell, downloadVariantMetadata } from '../../components/download/shared';
import { Download4 } from './Download4';
import s from './download-4.module.css';

export const metadata = downloadVariantMetadata('/download-4');

export default function DownloadVariant4Page() {
  return (
    <DownloadShell className={s.page}>
      <Download4 />
    </DownloadShell>
  );
}
