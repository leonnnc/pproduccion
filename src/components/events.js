import { supabase } from '../supabase.js';
import { showToast, formatDate, formatDateTime, SERVICE_TYPES } from '../utils/helpers.js';

export function renderEventsView(container, profile) {
  const isLeader = profile.rol === 'superleader' || profile.rol === 'leader';
  
  const renderLayout = () => {
    container.innerHTML = `
      <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 class="dashboard-title">Programación de Servicios</h2>
          <p class="dashboard-subtitle">Gestiona y visualiza la planificación de los cultos dominicales, reuniones de oración y eventos especiales.</p>
        </div>
        ${isLeader ? `
          <button class="btn-primary" id="btn-schedule-event" style="width: auto;">
            <i class="ph ph-calendar-plus"></i> Programar Servicio
          </button>
        ` : ''}
      </div>

      <div class="events-list" id="events-list-container">
        <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Cargando servicios...</p>
      </div>
    `;

    // Cargar la lista de eventos
    loadEvents();

    // Event listener para crear evento
    document.getElementById('btn-schedule-event')?.addEventListener('click', openCreateEventModal);
  };

  const loadEvents = async () => {
    const listContainer = document.getElementById('events-list-container');
    try {
      // Obtener todos los eventos ordenados por fecha y hora (más recientes primero o a futuro)
      const { data: events, error } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha_hora', { ascending: true });

      if (error) throw error;

      if (!events || events.length === 0) {
        listContainer.innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
            <i class="ph ph-calendar-x" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem; display: block;"></i>
            No hay servicios o eventos programados.
            ${isLeader ? '<p style="margin-top: 0.5rem;">Comienza programando uno con el botón superior.</p>' : ''}
          </div>
        `;
        return;
      }

      listContainer.innerHTML = '';
      
      for (const ev of events) {
        const evCard = document.createElement('div');
        evCard.className = 'card event-card';
        evCard.setAttribute('data-id', ev.id);
        
        // Obtener asignaciones de este evento
        const { data: assignments, error: asigError } = await supabase
          .from('asignaciones')
          .select(`
            id,
            rol_en_evento,
            estado,
            usuarios (id, nombre_completo),
            areas (id, nombre)
          `)
          .eq('evento_id', ev.id);

        let assignmentsHtml = '';
        if (assignments && assignments.length > 0) {
          // Agrupar asignaciones por área
          const areasMap = {};
          assignments.forEach(asig => {
            const areaName = asig.areas?.nombre || 'Sin Área';
            if (!areasMap[areaName]) areasMap[areaName] = [];
            areasMap[areaName].push(asig);
          });

          assignmentsHtml += `<div style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">`;
          Object.keys(areasMap).forEach(areaName => {
            assignmentsHtml += `
              <div style="margin-bottom: 0.5rem;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">${areaName}:</span>
                <div class="assignments-list">
            `;
            areasMap[areaName].forEach(asig => {
              const u = asig.usuarios;
              const checkIcon = asig.estado === 'confirmado' 
                ? '<i class="ph ph-check-circle" style="color: var(--color-success);"></i>' 
                : (asig.estado === 'rechazado' 
                  ? '<i class="ph ph-x-circle" style="color: var(--color-danger);"></i>' 
                  : '<i class="ph ph-clock" style="color: var(--color-warning);"></i>');
              
              const statusClass = asig.estado === 'confirmado' ? 'confirmed' : (asig.estado === 'rechazado' ? 'rejected' : 'pending');

              assignmentsHtml += `
                <span class="assignment-badge ${statusClass}" title="Rol: ${asig.rol_en_evento} - Estado: ${asig.estado}">
                  ${checkIcon}
                  <span>${u.nombre_completo}</span>
                  <span style="font-size: 0.7rem; color: var(--text-muted);">(${asig.rol_en_evento})</span>
                </span>
              `;
            });
            assignmentsHtml += `</div></div>`;
          });
          assignmentsHtml += `</div>`;
        } else {
          assignmentsHtml = `
            <div style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
              Ningún equipo asignado todavía.
            </div>
          `;
        }

        evCard.innerHTML = `
          <div style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
              <div class="event-info">
                <h4>${ev.titulo}</h4>
                <div class="event-meta">
                  <span><i class="ph ph-tag"></i> ${SERVICE_TYPES[ev.tipo] || ev.tipo}</span>
                  <span><i class="ph ph-calendar"></i> ${formatDateTime(ev.fecha_hora)}</span>
                </div>
                ${ev.descripcion ? `<p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">${ev.descripcion}</p>` : ''}
              </div>
              <div class="event-actions">
                ${isLeader ? `
                  <button class="btn-secondary btn-manage-team" data-id="${ev.id}">
                    <i class="ph ph-users-three"></i> Gestionar Equipo
                  </button>
                  <button class="btn-danger btn-delete-event" data-id="${ev.id}" style="padding: 0.5rem; display: flex; align-items: center; justify-content: center;" title="Eliminar Evento">
                    <i class="ph ph-trash"></i>
                  </button>
                ` : ''}
              </div>
            </div>
            ${assignmentsHtml}
          </div>
        `;
        listContainer.appendChild(evCard);
      }

      // Event listeners para los botones de gestión y eliminación
      listContainer.querySelectorAll('.btn-manage-team').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const ev = events.find(x => x.id === id);
          openManageTeamModal(ev);
        });
      });

      listContainer.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm('¿Estás seguro de eliminar este servicio? Esto eliminará también todas las asignaciones asociadas.')) {
            await deleteEvent(id);
          }
        });
      });

    } catch (err) {
      listContainer.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 2rem;">Error al cargar servicios: ${err.message}</p>`;
    }
  };

  const deleteEvent = async (id) => {
    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Servicio eliminado correctamente.', 'success');
      loadEvents();
    } catch (err) {
      showToast('Error al eliminar servicio: ' + err.message, 'error');
    }
  };

  // Modal para crear servicio
  const openCreateEventModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Programar Nuevo Servicio</h3>
          <button class="btn-logout" id="btn-close-modal"><i class="ph ph-x"></i></button>
        </div>
        <form id="create-event-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="ev-tipo">Tipo de Servicio</label>
              <select id="ev-tipo" class="form-input" style="padding-left: 1rem;" required>
                <option value="domingo_8am">${SERVICE_TYPES.domingo_8am}</option>
                <option value="domingo_11am">${SERVICE_TYPES.domingo_11am}</option>
                <option value="domingo_1pm">${SERVICE_TYPES.domingo_1pm}</option>
                <option value="domingo_7pm">${SERVICE_TYPES.domingo_7pm}</option>
                <option value="miercoles_730pm">${SERVICE_TYPES.miercoles_730pm}</option>
                <option value="especial">${SERVICE_TYPES.especial}</option>
              </select>
            </div>
            
            <div class="form-group" id="group-titulo" style="display: none;">
              <label class="form-label" for="ev-titulo">Título del Evento Especial</label>
              <input type="text" id="ev-titulo" class="form-input" placeholder="Ej: Congreso de Jóvenes, Concierto..." style="padding-left: 1rem;" />
            </div>

            <div class="form-group">
              <label class="form-label" for="ev-fecha-hora">Fecha y Hora de Inicio</label>
              <input type="datetime-local" id="ev-fecha-hora" class="form-input" required style="padding-left: 1rem;" />
            </div>

            <div class="form-group">
              <label class="form-label" for="ev-descripcion">Notas / Detalles Adicionales</label>
              <textarea id="ev-descripcion" class="form-input" placeholder="Detalles de la producción, predica o temas especiales..." style="padding-left: 1rem; height: 80px; resize: none;"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btn-cancel-event">Cancelar</button>
            <button type="submit" class="btn-primary" style="width: auto;">Programar Servicio</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-event').addEventListener('click', closeModal);

    const tipoSelect = document.getElementById('ev-tipo');
    const tituloGroup = document.getElementById('group-titulo');
    const tituloInput = document.getElementById('ev-titulo');

    tipoSelect.addEventListener('change', () => {
      if (tipoSelect.value === 'especial') {
        tituloGroup.style.display = 'block';
        tituloInput.required = true;
      } else {
        tituloGroup.style.display = 'none';
        tituloInput.required = false;
        tituloInput.value = '';
      }
    });

    document.getElementById('create-event-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const tipo = tipoSelect.value;
      const titulo = tipo === 'especial' ? tituloInput.value.trim() : SERVICE_TYPES[tipo];
      const fecha_hora = new Date(document.getElementById('ev-fecha-hora').value).toISOString();
      const descripcion = document.getElementById('ev-descripcion').value.trim();

      try {
        const { error } = await supabase
          .from('eventos')
          .insert({
            tipo,
            titulo,
            fecha_hora,
            descripcion,
            creado_por: profile.id
          });

        if (error) throw error;
        
        showToast('Servicio programado correctamente.', 'success');
        closeModal();
        loadEvents();
      } catch (err) {
        showToast('Error al crear servicio: ' + err.message, 'error');
      }
    });
  };

  // Modal para gestionar asignaciones del equipo del servicio
  const openManageTeamModal = async (ev) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Asignar Equipo</h3>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${ev.titulo} (${formatDateTime(ev.fecha_hora)})</span>
          </div>
          <button class="btn-logout" id="btn-close-modal"><i class="ph ph-x"></i></button>
        </div>
        
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Sección para Crear Asignación -->
          <div class="card" style="background: rgba(255,255,255,0.02); padding: 1rem;">
            <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem;"><i class="ph ph-plus-circle"></i> Agregar Integrante</h4>
            <form id="add-assignment-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Área</label>
                <select id="asig-area" class="form-input" style="padding-left: 1rem;" required>
                  <option value="">Seleccione Área...</option>
                </select>
              </div>
              
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Rol en el Servicio</label>
                <select id="asig-rol" class="form-input" style="padding-left: 1rem;" required>
                  <option value="Siervo">Siervo</option>
                  <option value="Co-líder">Co-líder</option>
                  <option value="Líder">Líder</option>
                </select>
              </div>

              <div class="form-group" style="grid-column: 1/-1; margin-bottom: 0;">
                <label class="form-label">Integrante (Se listan primero los disponibles para este día)</label>
                <select id="asig-usuario" class="form-input" style="padding-left: 1rem;" required disabled>
                  <option value="">Seleccione Integrante...</option>
                </select>
              </div>

              <button type="submit" class="btn-primary" style="grid-column: 1/-1; margin-top: 0.5rem;" id="btn-add-asig-submit" disabled>
                Asignar al Servicio
              </button>
            </form>
          </div>

          <!-- Lista de Asignaciones Actuales -->
          <div>
            <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem;"><i class="ph ph-list-bullets"></i> Equipo Asignado</h4>
            <div id="modal-assignments-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto;">
              <p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Cargando asignaciones...</p>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="btn-done-modal">Listo</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    const closeModal = () => {
      modal.remove();
      loadEvents(); // Recargar la vista de eventos
    };
    
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-done-modal').addEventListener('click', closeModal);

    const areaSelect = document.getElementById('asig-area');
    const userSelect = document.getElementById('asig-usuario');
    const submitBtn = document.getElementById('btn-add-asig-submit');

    // Cargar áreas
    const { data: areas } = await supabase.from('areas').select('id, nombre').order('nombre');
    if (areas) {
      areas.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.nombre;
        areaSelect.appendChild(opt);
      });
    }

    // Cargar asignaciones del modal
    const loadModalAssignments = async () => {
      const container = document.getElementById('modal-assignments-list');
      try {
        const { data, error } = await supabase
          .from('asignaciones')
          .select(`
            id,
            rol_en_evento,
            estado,
            usuarios (nombre_completo),
            areas (nombre)
          `)
          .eq('evento_id', ev.id);

        if (error) throw error;

        if (!data || data.length === 0) {
          container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; text-align: center; padding: 1rem;">Nadie asignado todavía.</p>`;
          return;
        }

        let html = '';
        data.forEach(asig => {
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 0.5rem 0.75rem; border-radius: var(--border-radius-sm);">
              <div>
                <strong>${asig.usuarios.nombre_completo}</strong>
                <span style="font-size:0.75rem; color: var(--text-muted);">en ${asig.areas.nombre} (${asig.rol_en_evento})</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="badge ${asig.estado === 'confirmado' ? 'badge-success' : (asig.estado === 'rechazado' ? 'badge-danger' : 'badge-warning')}">
                  ${asig.estado}
                </span>
                <button class="btn-logout btn-delete-asig" data-id="${asig.id}" style="color: var(--color-danger);" title="Quitar Asignación">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
            </div>
          `;
        });
        container.innerHTML = html;

        container.querySelectorAll('.btn-delete-asig').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const asigId = e.currentTarget.getAttribute('data-id');
            await deleteAssignment(asigId);
          });
        });

      } catch (err) {
        container.innerHTML = `<p style="color: var(--color-danger); font-size: 0.85rem;">Error: ${err.message}</p>`;
      }
    };

    const deleteAssignment = async (asigId) => {
      try {
        const { error } = await supabase.from('asignaciones').delete().eq('id', asigId);
        if (error) throw error;
        showToast('Integrante desasignado.', 'info');
        loadModalAssignments();
        // Recargar los usuarios disponibles
        if (areaSelect.value) areaSelect.dispatchEvent(new Event('change'));
      } catch (err) {
        showToast('Error al quitar asignación: ' + err.message, 'error');
      }
    };

    // Al seleccionar el área, cargamos los usuarios disponibles e integrantes de esa área
    areaSelect.addEventListener('change', async () => {
      const areaId = areaSelect.value;
      if (!areaId) {
        userSelect.disabled = true;
        submitBtn.disabled = true;
        userSelect.innerHTML = `<option value="">Seleccione Integrante...</option>`;
        return;
      }

      userSelect.innerHTML = `<option value="">Cargando integrantes...</option>`;
      userSelect.disabled = true;

      try {
        // 1. Obtener los miembros inscritos en el área seleccionada
        const { data: members, error: memError } = await supabase
          .from('miembros_areas')
          .select(`
            usuario_id,
            usuarios (id, nombre_completo, email, rol)
          `)
          .eq('area_id', areaId);

        if (memError) throw memError;

        // 2. Obtener los integrantes que marcaron DISPONIBILIDAD para esta fecha y tipo de servicio
        const datePart = ev.fecha_hora.split('T')[0]; // Obtener 'YYYY-MM-DD'
        const { data: availabilities, error: avError } = await supabase
          .from('disponibilidad')
          .select('usuario_id, turno')
          .eq('fecha', datePart);

        if (avError) throw avError;

        const availableUserIds = new Set(availabilities.map(a => a.usuario_id));

        // 3. Organizar y ordenar integrantes
        if (!members || members.length === 0) {
          userSelect.innerHTML = `<option value="">No hay integrantes inscritos en esta área</option>`;
          return;
        }

        userSelect.innerHTML = `<option value="">Seleccione Integrante...</option>`;
        
        // Filtrar y separar disponibles de no disponibles, omitiendo los superadmin (invisibles)
        const filteredMembers = members
          .filter(m => m.usuarios && m.usuarios.rol !== 'superadmin')
          .map(m => m.usuarios);

        const sortedMembers = filteredMembers.sort((a, b) => {
          const aAvail = availableUserIds.has(a.id) ? 1 : 0;
          const bAvail = availableUserIds.has(b.id) ? 1 : 0;
          return bAvail - aAvail; // Priorizar los disponibles
        });

        sortedMembers.forEach(u => {
          const isAvail = availableUserIds.has(u.id);
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = isAvail 
            ? `🟢 ${u.nombre_completo} (Disponible)` 
            : `⚪ ${u.nombre_completo} (Disponibilidad no declarada)`;
          userSelect.appendChild(opt);
        });

        userSelect.disabled = false;
        submitBtn.disabled = false;

      } catch (err) {
        userSelect.innerHTML = `<option value="">Error al cargar: ${err.message}</option>`;
      }
    });

    // Enviar asignación
    document.getElementById('add-assignment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usuario_id = userSelect.value;
      const area_id = areaSelect.value;
      const rol_en_evento = document.getElementById('asig-rol').value;

      try {
        const { error } = await supabase
          .from('asignaciones')
          .insert({
            evento_id: ev.id,
            usuario_id,
            area_id,
            rol_en_evento,
            estado: 'pendiente'
          });

        if (error) {
          if (error.code === '23505') {
            throw new Error('Este integrante ya está asignado a este servicio.');
          }
          throw error;
        }

        showToast('Asignación realizada. Se le notificará al siervo.', 'success');
        loadModalAssignments();
        // Resetear usuario select
        userSelect.value = '';
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    loadModalAssignments();
  };

  renderLayout();
}
