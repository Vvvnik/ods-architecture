import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getMessages,
  setCurrentLocale,
  type Locale,
  type Messages,
} from './index.js';

const STORAGE_KEY = 'ods.locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  messages: getMessages('en'),
});

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'ru' ? 'ru' : 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const locale = initialLocale();
    setCurrentLocale(locale);
    return locale;
  });

  const setLocale = useCallback((next: Locale) => {
    setCurrentLocale(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, messages: getMessages(locale) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Pick<LocaleContextValue, 'locale' | 'setLocale'> {
  const context = useContext(LocaleContext);
  return { locale: context.locale, setLocale: context.setLocale };
}

export function useMessages(): Messages {
  return useContext(LocaleContext).messages;
}
