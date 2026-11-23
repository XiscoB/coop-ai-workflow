// Interacciones ligeras de la web de Talleres Meridian.
document.addEventListener("DOMContentLoaded", function () {
  var year = new Date().getFullYear();
  document.querySelectorAll(".site-footer p").forEach(function (el) {
    el.textContent = el.textContent.replace("2026", String(year));
  });
});
