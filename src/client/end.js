import { isLose } from "./enemy.js";
import { isWin } from "./player_move.js";
import { stopAudio, stopBackgroundAudio } from "./audio.js";

let gameOver = false;

export function showLoseScreen() {
  const loseScreen = document.getElementById("lose-screen");
  if (loseScreen) loseScreen.style.display = "flex";
  const exitBtn = document.getElementById("lose-menu-btn");
  exitBtn.onclick = () => {
    location.reload();
  };
}

export function hideLoseScreen() {
  const loseScreen = document.getElementById("lose-screen");
  if (loseScreen) loseScreen.style.display = "none";
}

export function showWinScreen() {
  const winScreen = document.getElementById("win-screen");
  if (winScreen) winScreen.style.display = "flex";
  const exitBtn = document.getElementById("win-menu-btn");
  exitBtn.onclick = () => {
    location.reload();
  };
}

export function hideWinScreen() {
  const winScreen = document.getElementById("win-screen");
  if (winScreen) winScreen.style.display = "none";
}

export function checkGameOver(controls) {
  if (gameOver) return true;

  if (isLose) {
    gameOver = true;
    showLoseScreen();
    stopAudio();
    stopBackgroundAudio();
    if (controls && controls.isLocked) {
      controls.unlock();
    }
    return true;
  }

  if (isWin) {
    gameOver = true;
    showWinScreen();
    stopAudio();
    stopBackgroundAudio();
    if (controls && controls.isLocked) {
      controls.unlock();
    }
    return true;
  }

  return false;
}

export function resetGameOver() {
  gameOver = false;
  hideLoseScreen();
}

export function isGameOver() {
  return gameOver;
}
