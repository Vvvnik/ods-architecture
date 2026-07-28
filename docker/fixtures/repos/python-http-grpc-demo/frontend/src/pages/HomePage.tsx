import { Link } from 'react-router-dom';
import { getHealth, getPing } from '../api/health.js';

export function HomePage() {
  return (
    <main>
      <button type="button" onClick={() => getHealth()}>
        Check FastAPI health
      </button>
      <button type="button" onClick={() => getPing()}>
        Check Flask ping
      </button>
      <Link to="/orders">Orders</Link>
    </main>
  );
}
