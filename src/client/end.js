import { isLose } from "./enemy.js";
import { stopAudio, stopBackgroundAudio } from "./audio.js";

let gameOver = false;

export function showLoseScreen() {
  const loseScreen = document.getElementById("lose-screen");
  if (loseScreen) loseScreen.style.display = "flex";
}

export function hideLoseScreen() {
  const loseScreen = document.getElementById("lose-screen");
  if (loseScreen) loseScreen.style.display = "none";
}

export function checkLose(controls) {
  if (isLose && !gameOver) {
    gameOver = true;
    showLoseScreen();
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
