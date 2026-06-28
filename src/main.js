import './style.css';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { renderAuth } from './components/auth.js';
import { renderDashboard } from './components/dashboard.js';

const appContainer = document.getElementById('app');
const appView = document.getElementById('app-view');
let hasIntroPlayed = false;

function playFuturisticIntro() {
  return new Promise((resolve) => {
    const counterEl = document.getElementById('intro-counter');
    const statusTextEl = document.getElementById('intro-status-text');
    const slides = document.querySelectorAll('.intro-slide');
    
    let countdown = 3;
    
    const statusMessages = {
      3: 'CONECTANDO CON SERVIDORES...',
      2: 'CARGANDO MÓDULOS DE AUDIO Y VIDEO...',
      1: 'SISTEMA LISTO. ACCESO CONCEDIDO.'
    };

    // Mensaje inicial de estado
    if (statusTextEl) statusTextEl.textContent = statusMessages[3];

    const interval = setInterval(() => {
      countdown--;
      
      if (countdown >= 1) {
        if (counterEl) counterEl.textContent = countdown;
        if (statusTextEl) statusTextEl.textContent = statusMessages[countdown];

        slides.forEach((slide, index) => {
          const slideIndex = 3 - countdown;
          if (index === slideIndex) {
            slide.classList.add('active');
          } else {
            slide.classList.remove('active');
          }
        });
      }
      
      if (countdown === 0) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

async function initApp() {
  // 1. Si Supabase no está configurado (faltan variables .env), mostrar advertencia de configuración
  if (!isSupabaseConfigured) {
    renderAuth(appContainer);
    return;
  }

  // 2. Si es la primera vez que se carga la página, jugar la animación del intro
  if (!hasIntroPlayed) {
    const introEl = document.getElementById('futuristic-intro');
    
    // Preparar y cargar la sesión en segundo plano
    const renderPromise = (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          await renderDashboard(appView, session.user, () => initApp());
        } else {
          renderAuth(appView, () => initApp());
        }
      } catch (err) {
        console.error('Error al inicializar la aplicación:', err);
        renderAuth(appView, () => initApp());
      }
    })();

    // Esperar la carga de datos y la animación del intro (con cuenta atrás y cambio de slides)
    await Promise.all([
      renderPromise,
      playFuturisticIntro()
    ]);

    // Transición de salida de la intro
    if (introEl) {
      introEl.classList.add('fade-out');
      appView.style.display = 'block';
      
      // Eliminar el elemento del DOM tras el fadeout (500ms)
      setTimeout(() => {
        introEl.remove();
        hasIntroPlayed = true;
      }, 500);
    } else {
      appView.style.display = 'block';
      hasIntroPlayed = true;
    }
  } else {
    // Si la intro ya se reprodujo, renderizar directamente en el visor de la app sin esperas
    showLoadingScreen();
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        await renderDashboard(appView, session.user, () => initApp());
      } else {
        renderAuth(appView, () => initApp());
      }
    } catch (err) {
      console.error('Error al inicializar la aplicación:', err);
      renderAuth(appView, () => initApp());
    }
  }
}

// Escuchar cambios de estado en la autenticación en tiempo real
if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((event, session) => {
    // Solo reaccionar si ya pasó la intro para no interferir con la carga inicial
    if (hasIntroPlayed) {
      if (event === 'SIGNED_OUT') {
        renderAuth(appView, () => initApp());
      } else if (event === 'SIGNED_IN' && session?.user) {
        initApp();
      }
    }
  });
}

function showLoadingScreen() {
  appView.innerHTML = `
    <div class="app-loading-screen">
      <div class="spinner"></div>
      <p>Cargando ProDuccion...</p>
    </div>
  `;
}

// Iniciar aplicación
initApp();
