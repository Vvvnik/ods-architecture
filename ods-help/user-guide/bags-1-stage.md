/speckit-converge 
Активная спека: specs/003-portal-mvp
Проверить US3 сценарий 3: клик по файлу → содержимое в центре, не вечный placeholder.

/speckit-implement
Спека: specs/003-portal-mvp

После implement — повторный /speckit-converge на той же спеке; ожидается ✅ Converged.

Потом:

/speckit-implement
Спека: specs/003-portal-mvp
#9 (ручной sync → 500) — сначала backend (002), потом UI (003):

/speckit-converge
Спека: specs/002-domain-model
Повторный POST /projects/{id}/sync не должен отдавать 500; только ожидаемые коды (409 sync_in_progress и т.д.).
/speckit-implement
Спека: specs/002-domain-model
Затем то же для 003 (отображение ошибки в useSync / MainMenu).