import { DownloadShell, downloadVariantMetadata } from '../../components/download/shared';
import { Download1 } from './Download1';
import s from './download-1.module.css';

export const metadata = downloadVariantMetadata('/download-1');

export default function DownloadVariant1Page() {
  return (
    <DownloadShell className={s.page}>
      <Download1 />
    </DownloadShell>
  );
}
