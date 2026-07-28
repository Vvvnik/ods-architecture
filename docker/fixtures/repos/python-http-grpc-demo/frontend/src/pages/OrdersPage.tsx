import { Link } from 'react-router-dom';
import { getOrder, listOrders } from '../api/orders.js';

export function OrdersPage() {
  return (
    <main>
      <button type="button" onClick={() => listOrders()}>
        List orders
      </button>
      <button type="button" onClick={() => getOrder('42')}>
        Open order
      </button>
      <Link to="/home">Home</Link>
    </main>
  );
}
