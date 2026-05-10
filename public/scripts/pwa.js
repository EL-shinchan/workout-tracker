(function () {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {
        // PWA registration is a nice-to-have; the tracker still works without it.
      });
    });
  }
})();
