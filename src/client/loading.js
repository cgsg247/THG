export class LoadingManager {
  constructor() {
    // Находим элементы на странице (они уже есть в index.html)
    this.screen = document.getElementById("loading-screen");
    this.progressBar = document.getElementById("progress-bar");
    this.progressText = document.getElementById("progress-text");
    this.statusText = document.getElementById("status-text");

    // Список задач загрузки
    this.tasks = [];
    // Прогресс каждой задачи (по индексу)
    this.taskProgress = [];
    // Общий прогресс
    this.totalProgress = 0;
    // Флаг завершения
    this.isComplete = false;
  }

  /**
   * Добавить задачу загрузки.
   * @param {Function} taskFn - асинхронная функция, которая принимает колбэк onProgress(percent, status)
   * @param {string} name - название задачи для отображения
   */
  addTask(taskFn, name = "") {
    this.tasks.push({ fn: taskFn, name });
    this.taskProgress.push(0); // начальный прогресс 0
  }

  /**
   * Запустить загрузку всех добавленных задач.
   * @returns {Promise} - разрешается, когда все задачи загружены
   */
  async start() {
    // Показываем экран загрузки
    this.screen.style.display = "flex";
    this.screen.style.opacity = "1";
    this.updateProgress(0, "Инициализация...");

    const total = this.tasks.length;
    if (total === 0) {
      this.complete();
      return;
    }

    // Запускаем все задачи параллельно, каждая передаёт свой колбэк
    const promises = this.tasks.map((task, index) => {
      return task.fn((percent, status) => {
        // Обновляем прогресс конкретной задачи
        this.taskProgress[index] = percent;
        // Вычисляем средний прогресс по всем задачам
        const sum = this.taskProgress.reduce((a, b) => a + b, 0);
        const avg = sum / total;
        this.updateProgress(avg, status || `Загрузка: ${task.name}`);
      });
    });

    // Ждём завершения всех
    await Promise.all(promises);

    // Все загружено
    this.complete();
  }

  /**
   * Обновить отображение прогресса.
   */
  updateProgress(percent, status) {
    const clamped = Math.min(percent, 100);
    this.progressBar.style.width = clamped + "%";
    this.progressText.textContent = Math.round(clamped) + "%";
    if (status) this.statusText.textContent = status;
    this.totalProgress = clamped;
  }

  /**
   * Завершить загрузку (прогресс 100%) и скрыть экран.
   */
  complete() {
    this.updateProgress(100, "✅ Готово!");
    this.isComplete = true;
    // Небольшая задержка перед скрытием
    setTimeout(() => {
      this.hide();
    }, 500);
  }

  /**
   * Скрыть экран загрузки с плавным исчезновением.
   */
  hide() {
    this.screen.style.opacity = "0";
    setTimeout(() => {
      this.screen.style.display = "none";
    }, 800);
  }

  /**
   * Сбросить состояние (очистить задачи, сбросить прогресс).
   */
  reset() {
    this.tasks = [];
    this.taskProgress = [];
    this.totalProgress = 0;
    this.isComplete = false;
    this.progressBar.style.width = "0%";
    this.progressText.textContent = "0%";
    this.statusText.textContent = "Подготовка...";
    this.screen.style.display = "none";
  }
}
