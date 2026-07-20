import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph-view.module.css';

export interface BreadcrumbItem {
  id: string | null;
  label: string;
}

export interface GraphBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (focusId: string | null) => void;
}

export function GraphBreadcrumbs({ items, onNavigate }: GraphBreadcrumbsProps) {
  const messages = useMessages();
  const crumbs =
    items.length === 0
      ? [{ id: null as string | null, label: messages.GRAPH_VIEW_BREADCRUMB_SYSTEM }]
      : items;

  const parentId =
    crumbs.length > 1 ? crumbs[crumbs.length - 2]?.id ?? null : null;
  const atSystem = crumbs.length <= 1;

  return (
    <div className={styles.crumbs} aria-label={messages.focusNavigation}>
      {crumbs.map((item, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${item.id ?? 'system'}-${index}`}>
            {index > 0 ? <span className={styles.sep}>›</span> : null}{' '}
            {isLast ? (
              <span>{item.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(item.id)}>
                {item.label}
              </button>
            )}
          </span>
        );
      })}
      {!atSystem ? (
        <>
          <span className={styles.sep}>·</span>
          <button type="button" onClick={() => onNavigate(parentId)}>
            {messages.GRAPH_VIEW_UP}
          </button>
          <button type="button" onClick={() => onNavigate(null)}>
            {messages.GRAPH_VIEW_TO_SYSTEM}
          </button>
        </>
      ) : null}
    </div>
  );
}
