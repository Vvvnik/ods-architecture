import { Outlet } from 'react-router-dom';

import { ConnectionBanner } from '../components/ConnectionBanner.js';
import { MainMenu } from '../components/MainMenu.js';
import styles from '../styles/app.module.css';

export function AppLayout() {
  return (
    <div>
      <ConnectionBanner />
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Навигация">
          <h1 className={styles.title}>ODS</h1>
          <MainMenu />
        </aside>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
