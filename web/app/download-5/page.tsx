import { DownloadShell, downloadVariantMetadata } from '../../components/download/shared';
import { Download5 } from './Download5';
import s from './download-5.module.css';

export const metadata = downloadVariantMetadata('/download-5');

export default function DownloadVariant5Page() {
  return (
    <DownloadShell className={s.page}>
      <Download5 />
    </DownloadShell>
  );
}
