# CloudPayments Meeting Badge

Бейдж для отображения информации о встречах в OBS Studio с интеграцией Google Calendar.

## 🚀 Быстрый старт

1. **Скачайте файлы** проекта
2. **Откройте `index.html`** в браузере
3. **Настройте календарь** (см. раздел "Настройка календаря")
4. **Добавьте в OBS** как Browser Source

## 📅 Настройка календаря

### Шаг 1: Получите ссылку на календарь
1. Откройте [Google Calendar](https://calendar.google.com)
2. Найдите ваш календарь в левом меню
3. Нажмите на три точки → "Настройки и доступ"
4. Прокрутите вниз до "Интеграция календаря"
5. Скопируйте "Секретный адрес в формате iCal"

### Шаг 2: Обновите конфигурацию
1. Откройте файл `config.js`
2. Найдите строку `CALENDAR_URL:`
3. Вставьте скопированную ссылку вместо текущей
4. Сохраните файл

```javascript
const CONFIG = {
    CALENDAR_URL: 'ВАША_ССЫЛКА_НА_КАЛЕНДАРЬ_ЗДЕСЬ',
    // ... остальные настройки
};
```

## ⚙️ Настройка OBS

### Добавление Browser Source
1. В OBS добавьте новый источник "Browser Source"
2. **URL:** `https://ваш-сайт.com/meeting-badge/`
3. **Ширина:** `686px`
4. **Высота:** `350px`
5. **Обновить браузер при активации сцены:** ✅
6. **Остановить источник когда не виден:** ❌

### Рекомендуемые настройки
- **FPS:** 30
- **CSS:** вставьте код ниже
- **JavaScript:** оставьте пустым

### CSS код для OBS
Скопируйте и вставьте этот код в поле **CSS** в настройках Browser Source:

```css
/* Принудительно устанавливаем точные размеры и прозрачность */
html, body {
    width: 686px !important;
    height: 350px !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: transparent !important;
}

/* Убираем любые отступы и скролл */
* {
    box-sizing: border-box !important;
}

/* Принудительная прозрачность для всех элементов */
.badge-container {
    background: transparent !important;
}

/* Фиксируем размеры основного контейнера */
.meeting-badge {
    width: 626px !important;
    height: 130px !important;
    margin: 0 !important;
    background: transparent !important;
}

/* Фиксируем размеры логотипа компании */
.company-logo {
    width: 626px !important;
    height: 130px !important;
    margin: 0 !important;
    background: #0037C0 !important; /* Только логотип компании имеет фон */
}

/* Фиксируем размеры бейджей сотрудника */
.employee-info {
    width: 626px !important;
    margin: 30px 0 0 0 !important;
    background: transparent !important;
}

/* Фиксируем размеры зон ответственности */
.responsibility-areas {
    width: 626px !important;
    margin: 30px 0 0 0 !important;
    background: transparent !important;
}
```

### Дополнительные CSS настройки (опционально)
Если нужно убрать тени и эффекты для стабильности:

```css
/* Убираем все тени и эффекты */
* {
    box-shadow: none !important;
    text-shadow: none !important;
    filter: none !important;
    animation: none !important;
    transition: none !important;
}

/* Скрываем скролл полностью */
html, body {
    overflow: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
}

html::-webkit-scrollbar, body::-webkit-scrollbar {
    display: none !important;
}
```

## 🎨 Настройка внешнего вида

### Изменение цветов
Откройте `config.js` и измените цвета:

```javascript
const CONFIG = {
    PRIMARY_COLOR: '#0037C0',     // Основной синий цвет
    WARNING_COLOR: '#FF9800',    // Цвет предупреждения
    OVERDUE_COLOR: '#f44336',    // Цвет просроченных встреч
};
```

### Изменение интервалов обновления
```javascript
const CONFIG = {
    TIMER_INTERVAL: 1000,        // Обновление таймера (мс)
    CALENDAR_INTERVAL: 30000,    // Обновление календаря (мс)
    OBS_REFRESH_INTERVAL: 30000, // Обновление OBS (мс)
};
```

## 🔧 Функции

### Автоматическое обновление
- **Таймер:** каждую секунду
- **Календарь:** каждые 30 секунд
- **OBS:** каждые 30 секунд
- **При фокусе:** мгновенно

### Ручное обновление
- **F5** - обновить календарь
- **Ctrl+R** - обновить календарь
- **Консоль:** `refreshCalendar()` или `forceOBSRefresh()`

### Отображение
- **Есть встреча:** показывает оставшееся время + заполнение
- **Нет встречи:** показывает "Free-time" + время до следующей
- **Нет встреч:** показывает логотип компании

## 📁 Структура проекта

```
cloudpayments-meeting-badge/
├── index.html          # Основная страница
├── style.css           # Стили
├── script.js           # Логика приложения
├── config.js           # Конфигурация
├── assets/             # Ресурсы
│   ├── svg/           # Иконки и логотипы
│   └── fonts/         # Шрифты
└── README.md          # Документация
```

## 📏 Размеры бейджа

### Основные размеры:
- **Общий размер:** `686×350px`
- **Бейдж с таймером:** `626×130px`
- **Бейдж должности + ФИО:** `626×80px`
- **Зоны ответственности:** `626×40px`

### Структура:
```
┌─────────────────────────────────────┐ 686px
│  Бейдж с таймером (626×130px)      │
├─────────────────────────────────────┤
│  PM    │  Апалишин Марк            │ 80px
├─────────────────────────────────────┤
│  Alt-методы, реклама               │ 40px
└─────────────────────────────────────┘
```

## 🐛 Отладка

### Локальная отладка
1. Откройте `index.html` в браузере
2. Нажмите F12 → Console
3. Проверьте логи загрузки календаря

### Проблемы с календарем
- Убедитесь, что календарь публичный
- Проверьте правильность ссылки в `config.js`
- Проверьте CORS настройки

### Проблемы с OBS
- Убедитесь, что URL правильный
- Проверьте настройки Browser Source
- Попробуйте `forceOBSRefresh()` в консоли

## 📝 Лицензия

Проект создан для CloudPayments. Все права защищены.

## 🤝 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на ошибки
2. Убедитесь в правильности настройки календаря
3. Проверьте настройки OBS Browser Source
