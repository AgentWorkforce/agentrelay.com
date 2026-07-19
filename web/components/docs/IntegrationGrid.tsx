import { providerLogo } from '../../lib/integration-logos';
import { providersByCategory } from '../../lib/integrations';

import styles from './IntegrationGrid.module.css';

/**
 * Every provider Relayfile ships an adapter for, grouped by category.
 * Providers with no vendored logo (databases and cloud infra, mostly) render a
 * monogram tile so the grid stays even.
 *
 * Plain <img> rather than next/image — the SST/OpenNext optimizer 500s without
 * sharp, which is the same reason AgentArt uses one.
 */
export function IntegrationGrid() {
  return (
    <div className={styles.wrap}>
      {providersByCategory().map(({ category, providers }) => (
        <section key={category} className={styles.group}>
          <h3 className={styles.groupTitle}>{category}</h3>
          <ul className={styles.grid}>
            {providers.map((provider) => {
              const logo = providerLogo(provider.id);

              return (
                <li key={provider.id} className={styles.item}>
                  <span className={styles.mark}>
                    {logo ? (
                      <img src={logo} alt="" aria-hidden="true" loading="lazy" />
                    ) : (
                      <span className={styles.monogram}>{provider.name.slice(0, 1)}</span>
                    )}
                  </span>
                  <span className={styles.name}>{provider.name}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
