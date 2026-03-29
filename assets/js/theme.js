/* =============================================
   theme.js — Dark/Light mode toggle
   ============================================= */

const Theme = {
  init() {
    // Carrega preferência salva ou usa dark como padrão
    const saved = localStorage.getItem('ts-theme') || 'dark';
    this.apply(saved);
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ts-theme', theme);

    // Atualiza ícone do toggle
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.apply(current === 'dark' ? 'light' : 'dark');
  },

  current() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
};

// Inicializa imediatamente para evitar flash
Theme.init();
