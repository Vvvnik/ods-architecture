import { Outlet } from 'react-router-dom';

import { ConnectionBanner } from '../components/ConnectionBanner.js';
import { MainMenu } from '../components/MainMenu.js';
import { AnalysisProvider } from '../context/AnalysisProvider.js';
import { useLocale, useMessages } from '../i18n/locale.js';
import styles from '../styles/app.module.css';

export function AppLayout() {
  const { locale, setLocale } = useLocale();
  const messages = useMessages();

  return (
    <AnalysisProvider>
      <div className={styles.root}>
        <ConnectionBanner />
        <header className={styles.appHeader}>
          <span className={styles.title}>ODS</span>
          <label className={styles.languageSelect}>
            <span>{messages.language}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as 'en' | 'ru')}
              aria-label={messages.language}
            >
              <option value="en">EN</option>
              <option value="ru">RU</option>
            </select>
          </label>
        </header>
        <div className={styles.shell}>
          <aside className={styles.sidebar} aria-label={messages.navLabel}>
            <MainMenu />
          </aside>
          <main className={styles.main}>
            <Outlet />
          </main>
        </div>
      </div>
    </AnalysisProvider>
  );
}
