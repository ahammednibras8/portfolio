// Keeps the offline page ready. Without it, visitors get the browser's error.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}
