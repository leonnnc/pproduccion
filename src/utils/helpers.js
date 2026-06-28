/**
 * Mapeo de tipos de servicios a etiquetas amigables en español
 */
export const SERVICE_TYPES = {
  domingo_8am: 'Domingo - 8:00 AM',
  domingo_11am: 'Domingo - 11:00 AM',
  domingo_1pm: 'Domingo - 1:00 PM',
  domingo_7pm: 'Domingo - 7:00 PM',
  miercoles_730pm: 'Miércoles - 7:30 PM (Oración)',
  especial: 'Servicio Especial'
};

/**
 * Roles disponibles en el sistema y sus etiquetas
 */
export const ROLES = {
  superadmin: { label: 'Super Admin', level: 5, color: '#8b5cf6' },
  superleader: { label: 'Superlíder', level: 4, color: '#ff4757' },
  leader: { label: 'Líder', level: 3, color: '#ffa502' },
  coleader: { label: 'Co-líder', level: 2, color: '#1e90ff' },
  servant: { label: 'Siervo', level: 1, color: '#2ed573' }
};

/**
 * Formatea una fecha ISO a una cadena legible en español
 * @param {string|Date} dateString 
 * @returns {string} Ej: Viernes, 26 de Junio del 2026
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formatea una fecha y hora ISO a formato amigable
 * @param {string|Date} dateString 
 * @returns {string} Ej: 26 Jun 2026, 07:30 PM
 */
export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${formattedDate}, ${formattedTime}`;
}

/**
 * Mostrar notificaciones toast en la aplicación (UI)
 */
export function showToast(message, type = 'success') {
  // Buscar o crear contenedor de toasts
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'ph ph-info';
  if (type === 'success') iconClass = 'ph ph-check-circle';
  if (type === 'error') iconClass = 'ph ph-warning-circle';
  if (type === 'warning') iconClass = 'ph ph-warning';

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animación de entrada y salida
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
