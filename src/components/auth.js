import { supabase, isSupabaseConfigured } from '../supabase.js';
import { showToast } from '../utils/helpers.js';

export function renderAuth(container, onAuthSuccess) {
  if (!isSupabaseConfigured) {
    renderSetupWarning(container);
    return;
  }

  let isSignUpMode = false;

  const updateView = () => {
    container.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <h1 class="auth-logo">ProDuccion</h1>
            <p style="color: var(--text-secondary); margin-top: 0.25rem;">
              ${isSignUpMode ? 'Crear una cuenta nueva' : 'Iniciar sesión para continuar'}
            </p>
          </div>

          <form id="auth-form" class="auth-form">
            ${isSignUpMode ? `
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="nombre_completo">Nombre Completo</label>
                  <div class="input-wrapper">
                    <i class="ph ph-user input-icon"></i>
                    <input type="text" id="nombre_completo" class="form-input" placeholder="Juan Pérez" required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="telefono">Número de Teléfono</label>
                  <div class="input-wrapper">
                    <i class="ph ph-phone input-icon"></i>
                    <input type="tel" id="telefono" class="form-input" placeholder="+51 987654321" required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="distrito">Distrito de Lima</label>
                  <div class="input-wrapper">
                    <i class="ph ph-map-pin input-icon"></i>
                    <select id="distrito" class="form-input" style="padding-left: 2.2rem;" required>
                      <option value="">Seleccione Distrito...</option>
                      <option value="Ate">Ate</option>
                      <option value="Barranco">Barranco</option>
                      <option value="Breña">Breña</option>
                      <option value="Carabayllo">Carabayllo</option>
                      <option value="Chorrillos">Chorrillos</option>
                      <option value="Comas">Comas</option>
                      <option value="El Agustino">El Agustino</option>
                      <option value="Independencia">Independencia</option>
                      <option value="Jesús María">Jesús María</option>
                      <option value="La Molina">La Molina</option>
                      <option value="La Victoria">La Victoria</option>
                      <option value="Lince">Lince</option>
                      <option value="Los Olivos">Los Olivos</option>
                      <option value="Lurigancho-Chosica">Lurigancho-Chosica</option>
                      <option value="Lurín">Lurín</option>
                      <option value="Magdalena del Mar">Magdalena del Mar</option>
                      <option value="Miraflores">Miraflores</option>
                      <option value="Pachacámac">Pachacámac</option>
                      <option value="Pucusana">Pucusana</option>
                      <option value="Pueblo Libre">Pueblo Libre</option>
                      <option value="Puente Piedra">Puente Piedra</option>
                      <option value="Punta Hermosa">Punta Hermosa</option>
                      <option value="Punta Negra">Punta Negra</option>
                      <option value="Rímac">Rímac</option>
                      <option value="San Bartolo">San Bartolo</option>
                      <option value="San Borja">San Borja</option>
                      <option value="San Isidro">San Isidro</option>
                      <option value="San Juan de Lurigancho">San Juan de Lurigancho</option>
                      <option value="San Juan de Miraflores">San Juan de Miraflores</option>
                      <option value="San Luis">San Luis</option>
                      <option value="San Martín de Porres">San Martín de Porres</option>
                      <option value="San Miguel">San Miguel</option>
                      <option value="Santa Anita">Santa Anita</option>
                      <option value="Santa María del Mar">Santa María del Mar</option>
                      <option value="Santa Rosa">Santa Rosa</option>
                      <option value="Santiago de Surco">Santiago de Surco</option>
                      <option value="Surquillo">Surquillo</option>
                      <option value="Villa El Salvador">Villa El Salvador</option>
                      <option value="Villa María del Triunfo">Villa María del Triunfo</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="area_inicial">Área de Servicio</label>
                  <div class="input-wrapper">
                    <i class="ph ph-users-three input-icon"></i>
                    <select id="area_inicial" class="form-input" style="padding-left: 2.2rem;" required>
                      <option value="">Seleccione Área...</option>
                      <option value="Cámaras">Cámaras</option>
                      <option value="Switchers">Switchers</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="email">Correo Electrónico</label>
                  <div class="input-wrapper">
                    <i class="ph ph-envelope input-icon"></i>
                    <input type="email" id="email" class="form-input" placeholder="correo@ejemplo.com" required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="password">Contraseña</label>
                  <div class="input-wrapper">
                    <i class="ph ph-lock input-icon"></i>
                    <input type="password" id="password" class="form-input" placeholder="••••••••" minlength="6" required />
                  </div>
                </div>
              </div>
            ` : `
              <div class="form-group">
                <label class="form-label" for="email">Correo Electrónico</label>
                <div class="input-wrapper">
                  <i class="ph ph-envelope input-icon"></i>
                  <input type="email" id="email" class="form-input" placeholder="correo@ejemplo.com" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <div class="input-wrapper">
                  <i class="ph ph-lock input-icon"></i>
                  <input type="password" id="password" class="form-input" placeholder="••••••••" minlength="6" required />
                </div>
              </div>
            `}

            <button type="submit" class="btn-primary" id="btn-submit">
              <span>${isSignUpMode ? 'Crear Cuenta' : 'Ingresar'}</span>
              <i class="ph ph-arrow-right"></i>
            </button>
          </form>

          <div class="auth-separator">
            <span>o</span>
          </div>

          <button type="button" class="btn-google" id="btn-google">
            <i class="ph ph-google-logo" style="color: #ea4335;"></i>
            <span>Ingresar con Google</span>
          </button>

          <div class="auth-toggle-link">
            ${isSignUpMode 
              ? `¿Ya tienes una cuenta? <a href="#" id="toggle-auth-mode">Inicia sesión aquí</a>`
              : `¿No tienes una cuenta? <a href="#" id="toggle-auth-mode">Regístrate aquí</a>`
            }
          </div>

          <div class="auth-footer">
            <p>Servicios de ProDuccion &copy; 2026</p>
          </div>
        </div>
      </div>
    `;

    // Event Listener para alternar el modo de registro/login
    document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      updateView();
    });

    // Event Listener para inicio de sesión con Google (OAuth)
    document.getElementById('btn-google').addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err) {
        showToast('Error con Google: ' + err.message, 'error');
      }
    });

    // Event Listener para el formulario
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = document.getElementById('btn-submit');
      
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Procesando...</span><div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>`;

      try {
        if (isSignUpMode) {
          const nombre_completo = document.getElementById('nombre_completo').value.trim();
          const telefono = document.getElementById('telefono').value.trim();
          const distrito = document.getElementById('distrito').value;
          const area_inicial = document.getElementById('area_inicial').value;

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                nombre_completo,
                telefono,
                distrito,
                area_inicial
              }
            }
          });

          if (error) throw error;
          
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Crear Cuenta</span><i class="ph ph-arrow-right"></i>`;
          
          showVerificationModal(email, () => {
            isSignUpMode = false;
            updateView();
          });
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;

          showToast('Ingreso correcto. Cargando sistema...', 'success');
          if (data?.user) {
            onAuthSuccess(data.user);
          }
        }
      } catch (err) {
        showToast(err.message || 'Ocurrió un error en la autenticación', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>${isSignUpMode ? 'Crear Cuenta' : 'Ingresar'}</span><i class="ph ph-arrow-right"></i>`;
      }
    });
  };

  updateView();
}

function renderSetupWarning(container) {
  container.innerHTML = `
    <div class="setup-alert-screen">
      <div class="card setup-card">
        <i class="ph ph-warning"></i>
        <h2>Configuración Requerida</h2>
        <p>
          Para que el sistema de producción se conecte con la base de datos de <strong>Supabase (PostgreSQL)</strong>, 
          debes configurar las variables de entorno de Vite en un archivo llamado <code>.env</code> en la raíz del proyecto:
        </p>
        <div class="setup-code">
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
        </div>
        <p>
          Puedes encontrar estas credenciales en el panel de tu proyecto de Supabase bajo: <br>
          <strong>Project Settings > API</strong>.
        </p>
        <button class="btn-primary" onclick="window.location.reload()">
          <i class="ph ph-arrows-clockwise"></i>
          <span>Reintentar Conexión</span>
        </button>
      </div>
    </div>
  `;
}

function showVerificationModal(email, onClose) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 450px; text-align: center;">
      <div class="modal-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
        <i class="ph ph-envelope-open" style="font-size: 3.5rem; color: var(--primary); margin-top: 1rem;"></i>
      </div>
      <div class="modal-body" style="padding: 1.5rem 2rem;">
        <h3 style="font-size: 1.4rem; margin-bottom: 1rem; font-weight: 700;">¡Inscripción Iniciada!</h3>
        <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem; margin-bottom: 0.5rem;">
          Se envió un mensaje a su correo electrónico para confirmar la inscripción para su registro.
        </p>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem; background: rgba(255,255,255,0.02); padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border);">
          <strong>Correo:</strong> ${email}
        </p>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 1rem;">
          Por favor, revise su bandeja de entrada (y la carpeta de spam) y confirme su correo para poder iniciar sesión.
        </p>
      </div>
      <div class="modal-footer" style="justify-content: center; border-top: none; padding-top: 0; padding-bottom: 2rem;">
        <button class="btn-primary" id="btn-close-verify" style="width: auto; padding: 0.6rem 2rem;">
          <span>Entendido, gracias</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-close-verify').addEventListener('click', () => {
    modal.remove();
    if (onClose) onClose();
  });
}
