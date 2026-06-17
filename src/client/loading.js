// // loading.js
// export class LoadingScreen {
//   constructor() {
//     // Создаем HTML-структуру
//     this.overlay = document.createElement("div");
//     this.overlay.id = "loading-screen";
//     this.overlay.style.cssText = `
//       position: fixed;
//       top: 0;
//       left: 0;
//       width: 100%;
//       height: 100%;
//       background: rgba(0, 0, 0, 0.92);
//       display: flex;
//       flex-direction: column;
//       justify-content: center;
//       align-items: center;
//       z-index: 9999;
//       font-family: Arial, sans-serif;
//       transition: opacity 0.8s ease;
//     `;

//     // Логотип/заголовок
//     this.title = document.createElement("h1");
//     this.title.textContent = "🏚️ BACKROOMS";
//     this.title.style.cssText = `
//       color: #fff;
//       font-size: 48px;
//       margin-bottom: 30px;
//       text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
//       letter-spacing: 4px;
//     `;

//     // Контейнер для прогресс-бара
//     this.progressContainer = document.createElement("div");
//     this.progressContainer.style.cssText = `
//       width: 400px;
//       max-width: 80%;
//       height: 6px;
//       background: rgba(255, 255, 255, 0.1);
//       border-radius: 3px;
//       overflow: hidden;
//       position: relative;
//     `;

//     // Сам прогресс-бар
//     this.progressBar = document.createElement("div");
//     this.progressBar.style.cssText = `
//       width: 0%;
//       height: 100%;
//       background: linear-gradient(90deg, #00ff88, #00ccff);
//       border-radius: 3px;
//       transition: width 0.3s ease;
//     `;
//     this.progressContainer.appendChild(this.progressBar);

//     // Текст с процентами
//     this.percentText = document.createElement("div");
//     this.percentText.textContent = "0%";
//     this.percentText.style.cssText = `
//       color: rgba(255, 255, 255, 0.6);
//       font-size: 14px;
//       margin-top: 12px;
//       font-family: monospace;
//       letter-spacing: 2px;
//     `;

//     // Текст статуса
//     this.statusText = document.createElement("div");
//     this.statusText.textContent = "Подготовка...";
//     this.statusText.style.cssText = `
//       color: rgba(255, 255, 255, 0.4);
//       font-size: 13px;
//       margin-top: 8px;
//       font-family: monospace;
//     `;

//     // Собираем все в overlay
//     this.overlay.appendChild(this.title);
//     this.overlay.appendChild(this.progressContainer);
//     this.overlay.appendChild(this.percentText);
//     this.overlay.appendChild(this.statusText);

//     document.body.appendChild(this.overlay);

//     this.progress = 0;
//     this.isComplete = false;
//   }

//   // Обновление прогресса
//   update(progress, status = "") {
//     this.progress = Math.min(progress, 100);
//     this.progressBar.style.width = `${this.progress}%`;
//     this.percentText.textContent = `${Math.round(this.progress)}%`;

//     if (status) {
//       this.statusText.textContent = status;
//     }

//     // Если загрузка завершена
//     if (this.progress >= 100) {
//       this.isComplete = true;
//       this.statusText.textContent = "✅ Готово!";
//       setTimeout(() => this.hide(), 500);
//     }
//   }

//   // Показать экран загрузки
//   show() {
//     this.overlay.style.display = "flex";
//     this.overlay.style.opacity = "1";
//     this.progress = 0;
//     this.progressBar.style.width = "0%";
//     this.percentText.textContent = "0%";
//     this.statusText.textContent = "Подготовка...";
//     this.isComplete = false;
//   }

//   // Скрыть экран загрузки с анимацией
//   hide() {
//     this.overlay.style.opacity = "0";
//     setTimeout(() => {
//       this.overlay.style.display = "none";
//     }, 800);
//   }

//   // Полная загрузка (вызывается когда все готово)
//   complete() {
//     this.update(100, "✅ Загрузка завершена!");
//   }

//   // Удалить экран загрузки
//   destroy() {
//     this.overlay.remove();
//   }
// }
