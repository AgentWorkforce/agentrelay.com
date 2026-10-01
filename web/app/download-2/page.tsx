import { DownloadShell, downloadVariantMetadata } from '../../components/download/shared';
import { Download2 } from './Download2';
import s from './download-2.module.css';

export const metadata = downloadVariantMetadata('/download-2');

export default function DownloadVariant2Page() {
  return (
    <DownloadShell className={s.page}>
      <Download2 />
    </DownloadShell>
  );
}
