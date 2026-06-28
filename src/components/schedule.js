import { supabase } from '../supabase.js';
import { showToast, formatDate, SERVICE_TYPES } from '../utils/helpers.js';

export function renderScheduleView(container, profile) {
  
  const renderLayout = () => {
    container.innerHTML = `
      <div class="dashboard-header">
        <h2 class="dashboard-title">Mi Disponibilidad de Servicio</h2>
        <p class="dashboard-subtitle">Agenda los días y turnos en los que estás disponible para servir. Los líderes verán tu disponibilidad al planificar los equipos.</p>
      </div>

      <div class="dashboard-grid">
        <!-- Formulario para Registrar Disponibilidad -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="ph ph-calendar-plus"></i> Agendar Día de Servicio</h3>
          </div>
          
          <form id="add-availability-form">
            <div class="form-group">
              <label class="form-label" for="avail-fecha">Fecha</label>
              <input type="date" id="avail-fecha" class="form-input" style="padding-left: 1rem;" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="avail-turno">Turno / Horario Disponible</label>
              <select id="avail-turno" class="form-input" style="padding-left: 1rem;" required>
                <option value="domingo_8am">${SERVICE_TYPES.domingo_8am}</option>
                <option value="domingo_11am">${SERVICE_TYPES.domingo_11am}</option>
                <option value="domingo_1pm">${SERVICE_TYPES.domingo_1pm}</option>
                <option value="domingo_7pm">${SERVICE_TYPES.domingo_7pm}</option>
                <option value="miercoles_730pm">${SERVICE_TYPES.miercoles_730pm}</option>
                <option value="especial">Cualquier servicio / Evento Especial</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="avail-notas">Notas Adicionales (Opcional)</label>
              <input type="text" id="avail-notas" class="form-input" placeholder="Ej: Disponible en cabina o cámaras..." style="padding-left: 1rem;" />
            </div>

            <button type="submit" class="btn-primary" style="margin-top: 1rem;">
              <i class="ph ph-check"></i> Agendar Disponibilidad
            </button>
          </form>
        </div>

        <!-- Lista de Disponibilidades Registradas -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="ph ph-calendar-check"></i> Mis Días Agendados</h3>
          </div>
          <div class="availability-list" id="my-avail-list">
            <p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Cargando tu calendario...</p>
          </div>
        </div>
      </div>
    `;

    // Establecer la fecha mínima en el selector de fecha (hoy)
    const dateInput = document.getElementById('avail-fecha');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;

    // Cargar la lista
    loadAvailabilities();

    // Event listener para agregar disponibilidad
    document.getElementById('add-availability-form').addEventListener('submit', handleAddAvailability);
  };

  const loadAvailabilities = async () => {
    const listContainer = document.getElementById('my-avail-list');
    try {
      const { data, error } = await supabase
        .from('disponibilidad')
        .select('*')
        .eq('usuario_id', profile.id)
        .gte('fecha', new Date().toISOString().split('T')[0]) // Solo mostrar futuras o actuales
        .order('fecha', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="ph ph-calendar" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block;"></i>
            No tienes días de servicio agendados próximamente.
            <p style="font-size: 0.8rem; margin-top: 0.25rem;">Completa el formulario de la izquierda para registrar tu disponibilidad.</p>
          </div>
        `;
        return;
      }

      let html = '';
      data.forEach(item => {
        html += `
          <div class="availability-item">
            <div>
              <strong>${formatDate(item.fecha)}</strong>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">
                <i class="ph ph-clock"></i> ${SERVICE_TYPES[item.turno] || item.turno}
                ${item.notas ? `<br><span style="color: var(--text-muted);">Nota: "${item.notas}"</span>` : ''}
              </div>
            </div>
            <button class="btn-logout btn-delete-avail" data-id="${item.id}" style="color: var(--color-danger);" title="Eliminar Disponibilidad">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        `;
      });
      listContainer.innerHTML = html;

      // Event listener para eliminar disponibilidad
      listContainer.querySelectorAll('.btn-delete-avail').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          await deleteAvailability(id);
        });
      });

    } catch (err) {
      listContainer.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 1rem;">Error: ${err.message}</p>`;
    }
  };

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    
    const fecha = document.getElementById('avail-fecha').value;
    const turno = document.getElementById('avail-turno').value;
    const notas = document.getElementById('avail-notas').value.trim();

    try {
      const { error } = await supabase
        .from('disponibilidad')
        .insert({
          usuario_id: profile.id,
          fecha,
          turno,
          notas
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya registraste disponibilidad para este mismo turno en esta fecha.');
        }
        throw error;
      }

      showToast('Disponibilidad agendada correctamente.', 'success');
      
      // Limpiar notas y recargar lista
      document.getElementById('avail-notas').value = '';
      loadAvailabilities();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deleteAvailability = async (id) => {
    try {
      const { error } = await supabase
        .from('disponibilidad')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Disponibilidad cancelada.', 'info');
      loadAvailabilities();
    } catch (err) {
      showToast('Error al cancelar disponibilidad: ' + err.message, 'error');
    }
  };

  renderLayout();
}
