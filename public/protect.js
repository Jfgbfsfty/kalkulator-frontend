(function () {
  // Blokuj prawy przycisk myszy
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Blokuj skróty klawiaturowe DevTools
  document.addEventListener('keydown', function (e) {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'K')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  // Wykryj otwarcie DevTools przez zmianę rozmiaru okna
  var threshold = 160;
  var devtoolsOpen = false;
  setInterval(function () {
    var widthDiff  = window.outerWidth  - window.innerWidth  > threshold;
    var heightDiff = window.outerHeight - window.innerHeight > threshold;
    if ((widthDiff || heightDiff) && !devtoolsOpen) {
      devtoolsOpen = true;
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f1117;color:#e2e8f0;font-family:sans-serif;font-size:1.2rem;">Dostęp zablokowany.</div>';
    }
  }, 500);
})();
