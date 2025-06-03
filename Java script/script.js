document.getElementById('paramFab').onclick = function() {
  document.getElementById('paramMenu').classList.toggle('open');
};
window.onclick = function(e) {
  if (!e.target.closest('.param-fab') && !e.target.closest('.param-menu')) {
    document.getElementById('paramMenu').classList.remove('open');
  }
};
