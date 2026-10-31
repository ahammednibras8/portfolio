/*
 * Returns to the page the visitor wanted once the connection is back. Devices
 * can report being online a moment before requests work, so a failed reload
 * lands here again and tries once more after a short wait.
 */
const retryDelay = 4000;
const replacedAnotherPage = location.pathname !== "/offline/";

addEventListener("online", () => {
  location.reload();
});

if (replacedAnotherPage && navigator.onLine) {
  setTimeout(() => {
    location.reload();
  }, retryDelay);
}
