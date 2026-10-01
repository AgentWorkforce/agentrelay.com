import { DownloadShell, downloadVariantMetadata } from '../../components/download/shared';
import { Download3 } from './Download3';
import s from './download-3.module.css';

export const metadata = downloadVariantMetadata('/download-3');

export default function DownloadVariant3Page() {
  return (
    <DownloadShell className={s.page}>
      <Download3 />
    </DownloadShell>
  );
}
