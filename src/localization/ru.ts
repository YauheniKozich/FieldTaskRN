import { TaskStatus } from '../types';

export const ru = {
  tabs: { tasks: 'Задачи', map: 'Карта', history: 'История', settings: 'Настройки' },
  common: {
    cancel: 'Отмена', delete: 'Удалить', edit: 'Изменить', open: 'Открыть', retry: 'Повторить',
    createTask: 'Создать задачу', task: 'задача', tasks: 'задач', selected: 'Выбрано',
  },
  tasks: {
    greetingMorning: 'Доброе утро', greetingAfternoon: 'Добрый день', greetingEvening: 'Добрый вечер',
    all: 'Все', today: 'Сегодня', inProgress: 'В работе', search: 'Поиск задач…',
    count: (total: number, today: number) => `${total} ${taskWord(total)} · на сегодня: ${today}`,
    sort: 'Сортировка', newest: 'Сначала новые', due: 'По сроку', status: 'По статусу',
    overdue: 'Просрочено', dueSoon: 'Скоро срок',
    noMatches: 'Задачи не найдены', adjustSearch: 'Измените запрос или фильтры.',
    resetFilters: 'Сбросить поиск и фильтры', noTasks: 'Пока нет задач', firstTask: 'Создайте первую задачу. Она сохранится на устройстве и будет доступна без сети.',
    loading: 'Загружаем сохранённые задачи…', dueToday: 'срок сегодня',
    actions: 'Действия с задачей', actionHint: 'Выберите действие', deleteConfirm: 'Удалить задачу?',
    actionAccessibility: (title: string) => `Действия: ${title}`,
  },
  history: {
    subtitle: (count: number) => `${count} ${recordWord(count)}`,
    all: 'Все', reset: 'Сбросить фильтр', tasks: 'Задачи', status: 'Статусы', sync: 'Синхронизация',
    noActivity: 'Пока нет событий', noMatches: 'События не найдены',
    activityWillAppear: 'Изменения задач появятся здесь.', changeFilter: 'Выберите другой фильтр.',
    today: 'Сегодня', yesterday: 'Вчера', deleteItem: 'Удалить запись',
    accessibilityHint: 'Смахните влево или используйте действие «Удалить запись», чтобы удалить событие.',
    deleteErrorTitle: 'Не удалось удалить запись', retryAgain: 'Повторите попытку.',
    description: {
      created: (title: string) => `Создана задача «${title}».`,
      edited: (title: string) => `Изменена задача «${title}».`,
      deleted: (title: string) => `Удалена задача «${title}».`,
      attachmentAdded: (name: string) => `Добавлено вложение «${name}».`,
      attachmentRemoved: (name: string) => `Удалено вложение «${name}».`,
      statusChanged: (status: string) => `Новый статус: ${status.toLocaleLowerCase('ru-RU')}.`,
      syncSucceeded: (count: number) => `Синхронизировано изменений: ${count}.`,
      syncFailed: 'Не удалось синхронизировать изменения.',
      unknown: 'Подробности события недоступны.',
    },
    events: {
      task_created: 'Задача создана', task_edited: 'Задача изменена', task_deleted: 'Задача удалена',
      status_changed: 'Статус изменён', attachment_added: 'Вложение добавлено', attachment_removed: 'Вложение удалено',
      sync_succeeded: 'Синхронизация завершена', sync_failed: 'Ошибка синхронизации',
    } as Record<string, string>,
  },
  settings: {
    subtitle: 'Внешний вид, напоминания и синхронизация', appearance: 'Внешний вид', notifications: 'Уведомления',
    system: 'Системная', light: 'Светлая', dark: 'Тёмная', reminders: 'Напоминания о задачах',
    localNotifications: 'Уведомления о запланированных задачах', auto: 'АВТО', demo: 'Пробный режим',
    demoHint: 'Отправить тестовое уведомление через 30 секунд', sync: 'Синхронизация',
    waiting: (count: number) => `Ожидают отправки: ${count}`, allSynced: 'Все задачи синхронизированы',
    offlineSave: 'Без сети задачи сохраняются на устройстве', syncNow: 'Синхронизировать', dismiss: 'Закрыть',
    about: 'О приложении', productHint: 'Управление выездными задачами для специалистов', version: 'Версия 1.0.0', candidateCode: 'Код кандидата',
  },
  notifications: {
    channel: 'Напоминания о задачах',
    demoTitle: 'Пробное напоминание FieldTask',
    dueTitle: 'Срок задачи через 30 минут',
  },
  map: {
    subtitle: (count: number) => `${count} ${taskWord(count)} с координатами`, noTasks: 'Нет задач на карте',
    addCoordinates: 'Добавьте задаче корректные координаты, чтобы увидеть её здесь.',
    search: 'Поиск задач и адресов…', openOnly: 'Показать только активные задачи',
    noMatches: 'Задачи не найдены', loading: 'Загружаем карту…',
    tileError: 'Не удалось загрузить карту. Проверьте подключение к сети.',
    error: 'Не удалось загрузить карту.', openTask: 'Открыть задачу', viewTask: 'К задаче',
  },
  form: {
    unavailable: 'Задача недоступна', notAvailable: 'Задача удалена или не сохранена на этом устройстве.',
    back: 'К списку задач', editTitle: 'Изменить задачу', newTitle: 'Новая задача',
    task: 'Задача', title: 'Название *', titlePlaceholder: 'Например, проверить генератор',
    description: 'Описание *', descriptionPlaceholder: 'Что нужно сделать', schedule: 'Срок',
    dateTime: 'Дата и время *', datePlaceholder: 'ГГГГ-ММ-ДД', time: 'Время', reminder: 'Напоминание за 30 минут',
    location: 'Место', locationRequired: 'Адрес *', locationPlaceholder: 'Улица, город или объект',
    additional: 'Дополнительно', coordinatesAndAttachments: 'Координаты и вложения',
    coordinatesStatusAttachments: 'Координаты, статус и вложения', coordinates: 'Координаты',
    latitude: 'Широта', longitude: 'Долгота', status: 'Статус', attachments: (count: number) => `Вложения (${count})`,
    saveFirst: 'Сначала сохраните задачу, чтобы добавить вложения.', remove: 'Удалить', addMedia: 'Фото или видео', addFiles: 'Файлы',
    saveChanges: 'Сохранить изменения', create: 'Создать задачу', save: 'Сначала сохраните',
    savePhotoHint: 'Сохраните задачу, затем откройте её и выберите «Изменить», чтобы добавить вложения.',
    attachmentType: { image: 'Фото', video: 'Видео', document: 'Файл' } as Record<'image' | 'video' | 'document', string>,
    locationOff: 'Доступ к геопозиции выключен. Координаты можно ввести вручную.',
    locationFailed: 'Не удалось определить местоположение. Координаты можно ввести вручную.',
  },
  detail: {
    pastDue: 'Срок истёк', remaining: (hours: number, minutes: number) => hours ? (minutes ? `${hours} ч ${minutes} мин осталось` : `${hours} ч осталось`) : `${minutes} мин осталось`,
    openMaps: 'Открыть на карте', description: 'Описание', edit: 'Изменить', attachments: (count: number) => `Вложения (${count})`,
    noImages: 'Нет прикреплённых вложений.', unavailableImage: 'Файл недоступен', openAttachment: 'Открыть вложение', updateStatus: 'Изменить статус',
    activity: 'История изменений', viewAll: 'Все события', byYou: 'Вы', noActivity: 'Событий пока нет.',
    deleteConfirm: 'Удалить задачу?', editTask: 'Изменить задачу', taskDetails: 'Задача',
  },
  status: { new: 'Новая', in_progress: 'В работе', completed: 'Завершена', cancelled: 'Отменена' } as Record<TaskStatus, string>,
  syncStatus: { synced: 'Синхронизировано', failed: 'Ошибка синхронизации', pending: 'Ожидает синхронизации' },
  errors: {
    generic: 'Произошла ошибка. Повторите попытку.',
    loadTasks: 'Не удалось загрузить задачи.', saveTask: 'Не удалось сохранить задачу.', deleteTask: 'Не удалось удалить задачу.',
    reminder: 'Задача сохранена, но напоминание не обновлено. Проверьте разрешения и повторите синхронизацию.',
    loadAttachments: 'Не удалось загрузить вложения.', addAttachment: 'Не удалось добавить вложение.', removeAttachment: 'Не удалось удалить вложение.', openAttachment: 'Не удалось открыть файл.',
    updateStatus: 'Не удалось изменить статус задачи.', openMaps: 'Не удалось открыть карты на этом устройстве.',
    noCoordinates: 'Не удалось определить геопозицию.',
  },
} as const;

function recordWord(count: number): string {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'записей';
  const last = count % 10;
  if (last === 1) return 'запись';
  if (last >= 2 && last <= 4) return 'записи';
  return 'записей';
}

function taskWord(count: number): string {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'задач';
  const last = count % 10;
  if (last === 1) return 'задача';
  if (last >= 2 && last <= 4) return 'задачи';
  return 'задач';
}

export function localizeError(error: unknown, fallback: string = ru.errors.generic): string {
  const message = error instanceof Error ? error.message : '';
  const exact: Record<string, string> = {
    'Enter a task title.': 'Введите название задачи.',
    'Enter a task description.': 'Добавьте описание задачи.',
    'Enter a valid due date and time.': 'Укажите корректные дату и время.',
    'Due date must be in the future.': 'Срок должен быть в будущем.',
    'Enter a task address.': 'Укажите место выполнения задачи.',
    'Enter both latitude and longitude, or leave both blank.': 'Укажите обе координаты или оставьте оба поля пустыми.',
    'Latitude must be between −90 and 90.': 'Широта должна быть от −90 до 90.',
    'Longitude must be between −180 and 180.': 'Долгота должна быть от −180 до 180.',
    'This task is no longer available on this device.': ru.form.notAvailable,
    'The task no longer exists.': ru.form.notAvailable,
    'History item no longer exists.': 'Эта запись уже удалена.',
  };
  if (exact[message]) return exact[message];
  if (message.startsWith('Sync failed:')) return `Ошибка синхронизации: ${message.slice('Sync failed:'.length).trim()}`;
  return fallback;
}

export function localizeNotice(message: string): string {
  if (message === 'Sync complete.') return 'Синхронизация завершена.';
  if (message.startsWith('Sync failed:')) return 'Не удалось синхронизировать изменения. Проверьте подключение и повторите попытку.';
  if (message.startsWith('Offline.')) return 'Нет подключения к сети. Изменения сохранены на устройстве и будут отправлены позже.';
  if (message.startsWith('Demo notification scheduled')) return 'Тестовое уведомление запланировано примерно через 30 секунд.';
  if (message === 'Reminder could not be scheduled.' || message === 'Reminder could not be rescheduled.') return 'Не удалось запланировать напоминание.';
  if (/^[A-Za-z]/u.test(message)) return ru.errors.generic;
  return message;
}
