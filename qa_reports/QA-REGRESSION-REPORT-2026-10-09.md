# Regression QA: Arena Sold Out staging after fixes

**URL:** `https://new.arenasoldout.com/`  
**Дата:** 9 октября 2026  
**Режим:** повторный read-only QA. Формы не отправлялись, логин/платёж/бот не запускались, внешнее состояние не менялось.

## Итог

Большая часть ранее найденных проблем устранена. Повторный краулер прошёл **106 внутренних same-origin URL: 106/106 HTTP 200**.

Осталось **3 подтверждённых дефекта**:

1. **P1:** якорные ссылки при клике внутри уже открытой главной не прокручивают к разделу.
2. **P2:** калькулятор корректно считает валидные значения, но показывает отрицательные суммы при невалидных отрицательных числах.
3. **P3:** skip-link работает функционально, но остаётся невидимым при keyboard focus.

## Исправлено и подтверждено

### 1. Pricing calculator — исправлен для валидных значений

На `/pricing`:

- default `€38 × 120` → `€120.00`, sales `€4,560.00`;
- `€40 × 10` → `€10.00`, sales `€400.00`;
- `€50 × 10` with seating plan → `€15.00`, sales `€500.00`.

Поля обновляют итог через фактический typed input path.

### 2. Мобильная вёрстка и menu — исправлены

Проверено на `/`, `/pricing`, `/product/sell`, `/product/seating`, `/solutions`, `/solutions/concerts`, `/blog`, `/facts`.

- На CSS widths `320px` и `375px`: `scrollWidth = innerWidth`; глобального горизонтального overflow не обнаружено.
- `Menu` появляется на mobile, меняет `aria-expanded` с `false` на `true` и показывает `How it works`, `Who it is for`, `Pricing`, `Event center`, `Blog`, `Sign in`.
- Меню позволяет перейти на `/pricing` без появления mobile overflow.

### 3. Коммерческое раскрытие white-label fee — исправлено

На `/pricing` в тарифных карточках теперь явно указано:

> without the mention, €45 per event (detailed terms). No white-label fee on pages we host.

`Detailed terms` ведёт на `/pricing/terms`.

### 4. CTA и start form — исправлены/работают

- `Talk to us` ведёт на `/start`, где существует `#start-form`.
- `Start selling` и `Create your event` ведут в ожидаемый form flow.
- В start form есть labels, required fields, тип `email`, type `tel`, autocomplete и live-status.
- Клиентская validation телефона подтверждена как проверка 7–15 цифр; успешный submit/Turnstile намеренно не запускались.

### 5. Direct deep links — исправлены

При отдельной загрузке все проверенные hash URLs прокручиваются к цели:

- `/#how`
- `/#center`
- `/start#create`
- `/developers#api`
- `/developers#widget`

Целевые элементы после полной загрузки находятся в viewport, примерно на `top ≈ 80px`.

### 6. Редакторская ошибка статьи — исправлена

`/blog/direct-sales-vs-ticket-operators` теперь показывает корректный title/H1:

`Direct Sales vs Ticket Operators / Systems`

Лишний обратный слеш устранён.

## Оставшиеся дефекты

### P1 — Internal anchor click не прокручивает главную

**URL:** `https://new.arenasoldout.com/`

**Шаги:**

1. Открыть главную без hash.
2. Нажать реальной pointer-кнопкой `How it works` в desktop header.
3. URL становится `/#how`.
4. Page остаётся наверху: `scrollY = 0`; `#how` остаётся на `top ≈ 949px`, вне viewport.

То же подтверждено для `Event center` / `#center`.

**Важное различие:** прямое открытие страницы с `/#how` работает. Сломан именно переход по anchor link уже внутри загруженной страницы.

**Влияние:** menu обещает navigation по длинному landing, но click не доставляет пользователя к разделу. Deep-linking исправлен только частично.

**Направление исправления:** обработчик client-side navigation, вероятно, перехватывает click и обновляет history/hash без вызова scroll. Для same-page fragment links нужно позволить browser default либо после `pushState` делать `document.getElementById(id).scrollIntoView()`; затем добавить E2E для физического click/Enter, а не только direct URL load.

---

### P2 — Calculator отображает отрицательные деньги для невалидных чисел

**URL:** `https://new.arenasoldout.com/pricing`

**Шаги:**

1. В `Ticket price` ввести `-1`.
2. Оставить `Tickets sold = 10`.
3. Поле корректно имеет `validity.valid = false` из-за `min="0"`.
4. Но summary показывает `your sales €-10.00`.

Аналогично при отрицательном количестве результат может стать отрицательным.

**Влияние:** browser правильно помечает input невалидным, но пользователь всё равно видит невозможный коммерческий результат.

**Направление исправления:** до расчёта проверять `input.validity.valid`, clamp к нулю либо выводить нейтральный validation message вместо денежной суммы. Добавить тесты для negative/empty/non-numeric edge cases.

---

### P3 — Skip to content не видно при фокусе

**URL:** `https://new.arenasoldout.com/#main`

**Факт:** первый Tab фокусирует `Skip to content`; ссылка функциональна — Enter переносит focus на `main#main`. Но до активации элемент остаётся над viewport: `top = -48`, `bottom = -10`, поэтому visual keyboard user его не видит.

**Влияние:** доступность shortcut остаётся неполной.

**Направление исправления:** CSS для `:focus` / `:focus-visible` должен вывести skip-link внутрь видимой области; оставить доступный focus state и перевод focus на main.

## Технический статус

- **Маршруты:** 106/106 `HTTP 200`.
- **Mobile:** regression на 320/375px не обнаружена в проверенных ключевых разделах.
- **Публичные переходы:** core navigation и direct hash links работают, кроме internal same-page anchor click.
- **Не тестировалось:** submit/start-form success path, Turnstile, app login, payment/provider setup, ticket purchase/refund, email/QR/scanning, Telegram interaction, Safari/Firefox/real devices, field Core Web Vitals, полноценный screen-reader audit.
