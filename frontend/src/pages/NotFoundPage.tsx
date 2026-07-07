import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Страница не найдена</h2>
      <p>
        <Link to="/projects" style={{ color: '#2563eb' }}>
          Вернуться к проектам
        </Link>
      </p>
    </div>
  );
}
