export function showStory(onWatchVideo) {
  const storyScreen = document.getElementById("story-screen");
  if (!storyScreen) return;

  storyScreen.style.display = "flex";
  const watchBtn = document.getElementById("watch-video-btn");
  watchBtn.onclick = () => {
    storyScreen.style.display = "none";
    if (typeof onWatchVideo === "function") onWatchVideo();
  };
}

export function startVideo(onComplete) {
  const videoScreen = document.getElementById("video-screen");
  const video = document.getElementById("story-video");
  const skipBtn = document.getElementById("skip-video-btn");

  if (!videoScreen || !video) return;

  videoScreen.style.display = "block";

  function finishVideo() {
    video.pause();
    video.currentTime = 0;
    videoScreen.style.display = "none";
    video.removeEventListener("ended", finishVideo);
    skipBtn.onclick = null;
    if (typeof onComplete === "function") onComplete();
  }

  video.play().catch((err) => {
    console.warn("Видео не удалось воспроизвести:", err);
    finishVideo();
  });

  video.addEventListener("ended", finishVideo);
  skipBtn.onclick = finishVideo;
}
