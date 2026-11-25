# ТЗ: план статей блога на 9 языках (поиск + LLM)

- Дата: 2026-11-19. Статус: draft, версия 2 (решения Марины 19.11: детская страница не «family», страница сольных артистов, WordPress без плагина). Автор: сессия «Планы и ТЗ».
- Источники: `docs/seo/keywords.md` (batch 1, PR #33, ветка `claude/sleepy-blackwell-95def0`, ещё не в main),
  аудит SEO 18.11 (заметки сессии SEO), `docs/blog/ARTICLE-TEMPLATE.md`, `docs/competitors/prices-2026-11-11.md`,
  тексты `content/en/pages/`.
- Связанное ТЗ: `2026-11-19-site-texts-seo-llm.md` (правки страниц). Статьи и страницы делят одну карту запросов:
  статья никогда не забирает запрос, который карта отдала странице.

## 1. Цель

Чтобы организатор, который ищет «как продать билеты», «какую систему выбрать», «сколько берут площадки»,
находил ArenaSoldOut.com в Google/Bing и чтобы ChatGPT, Claude, Perplexity, Gemini цитировали наши ответы
и ссылались на нас. Одинаково на всех 9 языках сайта: en, es, pt, de, fr, it, pl, uk, ru.

Сегодня: 33 старых статьи en и 44 ru (импорт из WordPress, многие с длинными заголовками и пересекаются
по темам), 1 новая статья в 9 языках («как увеличить выручку мероприятия»). Остальные 7 языков блога пустые.

## 2. Принципы (для всех статей)

1. **Одна статья = один кластер запросов.** Цель берём из `docs/seo/keywords.md`. Если кластера нет, статья ждёт
   сессию «Поисковые запросы».
2. **Не перевод, а локализация запроса.** Структура, факты и ссылки одинаковые во всех языках, но title, h1 и
   первый абзац пишутся под запрос, которым ищут на этом языке (см. таблицу гипотез в §6). Гипотезы проверяет
   «Поисковые запросы» (batch 2) до публикации языка.
3. **Порядок языков:** ru-черновик → Марина правит (память «голос Марины») → en → 7 переводов с её текста
   (как сделано для статьи о выручке). Если Марина решит иначе (en первым), порядок меняется в одном месте этого ТЗ.
4. **Для LLM (GEO):** первый абзац отвечает на вопрос заголовка в 2–3 предложениях; одна таблица или список
   с фактами; блок FAQ (3–5 вопросов, разметка FAQPage уже поддержана через раздел `## FAQ`); числа с датой
   («по данным на 11.11.2026»); ArenaSoldOut.com названа одной и той же фразой-определением (см. ТЗ по текстам, §P9).
5. **Правда:** только то, что есть на страницах `content/en/pages/` и в `content/data/facts.yaml`. Цены в тексте
   статьи не пишем (Markdown не читает `tariff.yaml`), ставим ссылку на `/pricing`. Цены конкурентов только из
   `docs/competitors/prices-*.md` с датой проверки.
6. **Перелинковка:** каждая статья ведёт на свою целевую страницу (анкор = запрос страницы), на `/pricing` и `/start`;
   страница в ответ получает блок «Читайте также» (это делает ТЗ по текстам).
7. **Старые статьи:** если новая статья закрывает ту же тему, старый пост переписывается на месте (URL сохраняется,
   он уже набрал показы) или получает 301 на новую. Решение по каждой паре в §5.

## 3. План статей

Приоритет = польза для организатора × шанс попасть в выдачу. Волна 1 опирается на реальные показы (GSC) и
Semrush. Волны 2–3 опираются на гипотезы и требуют проверки запросов.

### Волна 1: запросы, по которым сайт уже показывается

| # | Рабочая тема (en) | Кластер | Что делать со старым постом | Целевая страница для ссылки |
|---|---|---|---|---|
| A1 | How to sell tickets on your own website: step-by-step guide | 3 | переписать `i-want-my-own-website-for-selling-tickets` (поз. 48) на месте; ru-пару тоже | `/product/sell`, `/developers`, `/solutions/wordpress` (только «интеграция с WordPress», плагин и WooCommerce не упоминать) |
| A2 | How to increase ticket sales for an event: 12 practical ways | 12 | переписать `increasing-ticket-sales-guide-for-event-organizers`; не дублировать статью о выручке, а ссылаться на неё | `/product/pricing-tools` |
| A3 | Event ticketing challenges and how to automate ticket sales | 14 + 16 | новая; `boosting-event-sales-...` и `the-evolution-of-event-technologies-...` ссылаются на неё | `/features`, `/product/tickets` |
| A4 | What is a ticketing system (and how it differs from a ticketing platform) | 13 | переписать `ticket-platform-vs-ticket-system-...-2`; `the-essential-functionality-of-a-ticket-system` ссылается на неё | `/` (анкор «event ticketing platform») |
| A5 | Who owns the buyer data when you sell tickets | 15 | переписать `customer-database-key-asset-...` | `/payments`, `/security` |
| A6 | Ticket service fees explained: who pays, how much, and why | 17 (+ en) | переписать `service-fees-in-ticket-sales-size-matters`; `ticket-service-fee-cost-...` → 301 на неё | `/pricing` |

### Волна 2: выбор платформы, сравнения, white label (сильнее всего цитируются LLM)

| # | Рабочая тема (en) | Зачем | Целевая страница |
|---|---|---|---|
| A7 | How to choose an event ticketing platform: a checklist for organizers | вопрос «какую выбрать» в ChatGPT/Perplexity; не трогает главную (запрос «how to choose», не «platform») | `/`, `/alternatives` |
| A8 | Ticketing fees compared: Eventbrite, Ticket Tailor, TicketSource, TicketSpice, Weezevent (2026) | сравнительная таблица с датой, LLM любят такие; данные только из `docs/competitors/` | 5 страниц `*-alternative` |
| A9 | Reserved seating vs general admission: how to sell seated tickets | бесплатная рассадка = наше отличие | `/product/seating` |
| A10 | Selling tickets for a concert tour across several cities | кластер «concert tour ticketing» | `/solutions/concert-tours` |
| A11 | Festival ticketing: day passes, multi-day tickets and categories | подпирает кластер 6 | `/solutions/festivals` |
| A12 | Selling tickets for exhibitions, museums and excursions | кластер 7 | `/solutions/exhibitions` (одобрена, вход по времени работает) |
| A13 | Selling tickets as a solo artist: fast, simple, no subscription | кластер 5 | `/solutions/solo-artists` |
| A14 | White label ticketing: run your own ticketing system on a platform | кластер 8 | `/product/white-label` (только подтверждённые возможности) |

### Волна 3: детские мероприятия (новая аудитория; семейные мероприятия будут отдельным направлением позже)

Запросы не изучались. Темы ниже: гипотезы. До написания «Поисковые запросы» делает batch 2 по детской теме
(§6) и подтверждает или меняет темы. Все статьи ведут на новую страницу `/solutions/children`
(см. ТЗ по текстам, §P6).

| # | Рабочая тема (en) | Что умеет платформа (правда из страниц) |
|---|---|---|
| K1 | How to sell tickets for children's events: child and adult tickets | add-on категории (детский только вместе со взрослым), бесплатный билет сопровождающему, шаги количества (`/product/pricing-tools`) |
| K2 | Pricing tickets for kids' shows and children's parties | льготный тариф для недорогих билетов (`/pricing`, «children's parties» уже названы там), промокоды |
| K3 | Children's theatre and puppet shows: selling seats with a seating plan | бесплатная рассадка, повторные даты (`/solutions/theatre`); кейс Family Theatre Kolybel, если клиент даст согласие |
| K4 | Children's shows on tour: circus, ice shows, many cities | `/solutions/shows` |
| K5 | Entry at children's events: scanning tickets without a queue | сканер MACS (`/product/scanner`) |

Не пишем (нет в продукте или запрещено правилами): регистрационные анкеты с данными ребёнка, согласия родителей,
проверка возраста, вопросы при оформлении заказа (custom checkout questions в списке запрещённых обещаний),
абонементы в лагеря и кружки, если Марина не подтвердит, что они есть.

### Волна 4 (после волн 1–3): локальные статьи по странам

По одной статье на страну, где есть страница `/countries/*` (Израиль, Нидерланды, Швейцария, Грузия, Армения,
Казахстан, Узбекистан): «как продавать билеты онлайн в <стране>: оплата, валюта, провайдер». Язык: язык страны,
если он есть на сайте, плюс en и ru. Названия регионов не используем, только страны.

## 4. Языки и объём

- Каждая статья волн 1–3 выходит на 9 языках, в одной группе hreflang.
- Волна 1: 6 статей × 9 = 54 файла. Волна 2: 8 × 9 = 72. Волна 3: 5 × 9 = 45. Итого 171 файла + обложки.
- Старые посты существуют только в en и ru: переписанная статья в других 7 языках появляется как новый файл
  со своим слагом на языке статьи и встаёт в ту же группу hreflang.
- Темп: 2 статьи в неделю (одна волна за 3–4 недели), чтобы Марина успевала править ru.

## 5. Старые статьи (гигиена архива, вместе с SEO)

1. Пары «старое → новое» из таблицы волны 1: переписать на месте или 301 (в `redirects.yaml`, обе стороны:
   Cloudflare и nginx собираются одним скриптом).
2. 43 заголовка > 60 и 21 описание > 160 (аудит 18.11): сократить без смены URL.
3. Явно не наша тема (`into-the-future-tour-sales-automation-...travel-industry`, `platform-as-a-service-paas`):
   Марина решает: оставить, noindex или 301 на ближайшую новую статью.
4. Пустые индексы блога на 7 языках сейчас тонкие страницы: noindex до первой статьи (задача SEO).

## 6. Гипотезы запросов по языкам (проверить в batch 2)

Не дословный перевод: так, по нашим предположениям, ищут на каждом языке. «Поисковые запросы» подтверждает
частотность (Search Console по языкам + Semrush по базе страны) и правит таблицу в `docs/seo/keywords.md`.

| Тема | es | pt (BR) | de | fr | it | pl | uk | ru |
|---|---|---|---|---|---|---|---|---|
| Платформа (главная) | plataforma de venta de entradas | plataforma de venda de ingressos | Ticketsystem für Veranstalter | billetterie en ligne | piattaforma biglietteria online | system sprzedaży biletów | система продажу квитків | система продажи билетов |
| Свой сайт (A1) | vender entradas en mi web | vender ingressos no meu site | Tickets auf eigener Website verkaufen | vendre des billets sur son site | vendere biglietti sul proprio sito | sprzedaż biletów na własnej stronie | продаж квитків на своєму сайті | продажа билетов на своём сайте |
| Продажи (A2) | cómo vender más entradas | como vender mais ingressos | mehr Tickets verkaufen | vendre plus de billets | vendere più biglietti | jak sprzedać więcej biletów | як продати більше квитків | как увеличить продажи билетов |
| Комиссии (A6) | comisión venta de entradas | taxa de venda de ingressos | Ticketgebühren Veranstalter | frais de billetterie | commissioni biglietteria | prowizja za sprzedaż biletów | комісія за продаж квитків | комиссия за продажу билетов |
| Детские (K1) | entradas para eventos infantiles | ingressos para eventos infantis | Tickets für Kinderveranstaltungen | billetterie spectacle enfant | biglietti eventi per bambini | bilety na wydarzenia dla dzieci | квитки на дитячі заходи | билеты на детские мероприятия |

Детская тема en (seed для batch 2): kids event ticketing, children's theatre ticketing, sell tickets for kids party,
child ticket with adult, school group tickets, kids show tickets.

## 7. Файлы

- `content/<lang>/posts/<slug>.md` + `content/<lang>/posts/images/<slug>/cover.jpg` (9 языков).
- `src/lib/translations.ts`: новые группы hreflang.
- `redirects.yaml`: 301 для склеенных старых постов.
- `docs/seo/keywords.md`: статус кластеров `gap/partly` → `covered` после публикации.

## 8. Критерии приёмки (на каждую статью)

1. `npm run check` и `npm run check:posts` проходят: title ≤ 60, description 70–160, обложка и alt есть,
   анти-слоп чист (нет длинного тире, «!», hype-слов, «our fee»), бренд только «ArenaSoldOut.com».
2. Статья есть во всех 9 языках, в одной группе hreflang, `check:hreflang` проходит.
3. Title и первый абзац на каждом языке содержат запрос этого языка из `docs/seo/keywords.md`.
4. Первый абзац отвечает на вопрос заголовка; есть раздел FAQ (в HTML появляется FAQPage JSON-LD).
5. Есть ссылки на целевую страницу кластера, `/pricing` и `/start`; ни одной цены числом в тексте.
6. Каждое утверждение о продукте находится на странице `content/en/pages/` или в `facts.yaml` (ревьюер сверяет).
7. Ru-версия прошла правку Марины; переводы сделаны с её текста.
8. Статья попадает в `llms-full.txt` и имеет Markdown-двойник (`/<lang>/blog/<slug>.md` отдаёт 200).

## 9. Риски

- Каннибализация: статья A7 или A4 начинает соревноваться с главной за «ticketing platform». Защита: правило
  кластеров, анкоры на главную.
- Детская тема: соблазн пообещать анкеты, согласия, возрастные ограничения. Защита: список «не пишем» в §3.
- Машинный перевод звучит криво (Марина уже заметила на ru). Защита: перевод с её текста, глоссарий
  `docs/i18n/TRANSLATION-BRIEF.md`, выборочная проверка носителем для de/fr/es (решение Марины).
- Данные конкурентов устаревают: A8 перепроверяется раз в квартал вместе с `docs/competitors/`.

## 10. Нужны решения Марины

1. Порядок языков: ru первым (как сейчас) или en первым?
2. Старые посты волны 1: переписываем на месте (рекомендую, URL уже в выдаче) или новые слаги + 301?
3. Детская аудитория: есть ли у платформы абонементы или серии занятий (кружки, лагеря)? (Групповые заказы для школ есть, через промокоды: ответ Марины 19.11; добавить в K1 и K2.)
   Можно ли упомянуть Family Theatre Kolybel как кейс?
4. Посты не по теме (travel, PaaS): оставить, noindex или 301?
5. Нужна ли вычитка носителем хотя бы для es, de, fr?
6. Batch 2 запросов: у сессии нет доступа к Semrush. Марина выгружает отчёты по базам стран (es, br, de, fr, it, pl, ua)
   и детские seed-запросы, или работаем только по Search Console и подсказкам Google?

## 11. Кто делает

- Проверка запросов по языкам и детской теме (batch 2): сессия «Поисковые запросы».
- Статьи волн 1–4: сессия «Статьи» (Sonnet для черновиков и переводов, Opus для финальной проверки фактов).
- 301, noindex пустых индексов, сокращение заголовков архива: сессия «SEO».

## 12. Оценка токенов

| Работа | Оценка |
|---|---|
| Batch 2 запросов (8 языков + детская тема) | 300–500 тыс. |
| Одна статья в 9 языках (ru-черновик, правка по диффу Марины, en, 7 переводов Sonnet, проверки, сборка) | 180–250 тыс. |
| Волна 1 (6 статей) | 1,1–1,5 млн |
| Волна 2 (8 статей) | 1,5–2,0 млн |
| Волна 3 (5 статей) | 0,9–1,3 млн |
| Гигиена архива (§5) | 150–250 тыс. |
| Итого волны 1–3 | ~4,0–5,6 млн |
