import { Link } from 'react-router-dom';
import { useMessages } from '../i18n/locale.js';

export function NotFoundPage() {
  const messages = useMessages();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{messages.NOT_FOUND_TITLE}</h2>
      <p>
        <Link to="/projects" style={{ color: '#2563eb' }}>
          {messages.NOT_FOUND_BACK}
        </Link>
      </p>
    </div>
  );
}
