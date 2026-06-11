export class GameMenu {
  constructor() {
    this.main = document.getElementById("main-menu");
    this.pause = document.getElementById("pause-menu");
    this.start = document.getElementById("start-btn");
    this.resume = document.getElementById("resume-btn");
    this.menu = document.getElementById("menu-btn");
    if (this.pause) this.pause.style.display = "none";
    this.active = this.paused = false;
  }

  showMain() {
    if (this.main) this.main.style.display = "flex";
    if (this.pause) this.pause.style.display = "none";
    this.active = this.paused = false;
  }
  hideMain() {
    if (this.main) this.main.style.display = "none";
    this.active = true;
    this.paused = false;
  }
  showPause() {
    if (this.active && !this.paused && this.pause) {
      this.pause.style.display = "flex";
      this.paused = true;
    }
  }
  hidePause() {
    if (this.pause) this.pause.style.display = "none";
    this.paused = false;
  }

  onStart(cb) {
    if (this.start) this.start.onclick = cb;
  }
  onResume(cb) {
    if (this.resume) this.resume.onclick = cb;
  }
  onExit(cb) {
    if (this.menu) this.menu.onclick = cb;
  }

  onEscape(onP, onR) {
    document.onkeydown = (e) => {
      if (e.code === "Escape" && this.active) this.paused ? onR() : onP();
    };
  }

  reset(player, controls) {
    if (player) {
      player.setTranslation({ x: 0, y: 10, z: 0 }, true);
      player.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    if (controls && controls.isLocked) controls.unlock();
  }
}
