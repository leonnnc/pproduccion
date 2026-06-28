import { supabase } from '../supabase.js';
import { showToast, formatDate, formatDateTime, SERVICE_TYPES, ROLES } from '../utils/helpers.js';
import { renderEventsView } from './events.js';
import { renderScheduleView } from './schedule.js';

export async function renderDashboard(container, user, onLogout) {
  let profile = null;
  let activeTab = 'home'; // home, events, schedule, areas, users

  // Cargar perfil del usuario
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    profile = data;
  } catch (err) {
    showToast('Error al cargar perfil de usuario: ' + err.message, 'error');
    // Perfil fallback básico si hay problemas
    profile = {
      id: user.id,
      email: user.email,
      nombre_completo: 'Siervo de ProDuccion',
      rol: 'servant'
    };
  }

  // Estructura principal del Dashboard (Sidebar ERP)
  const renderLayout = () => {
    const rolInfo = ROLES[profile.rol] || ROLES.servant;
    
    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Barra superior móvil -->
        <div class="mobile-topbar">
          <button class="mobile-menu-btn" id="mobile-menu-btn">
            <i class="ph ph-list"></i>
          </button>
          <div class="mobile-logo">
            <i class="ph ph-video-camera"></i>
            <span>ProDuccion</span>
          </div>
          <div style="width: 40px;"></div> <!-- Espaciador para centrar logo -->
        </div>

        <!-- Overlay para cerrar sidebar en móvil -->
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <!-- Sidebar Lateral (Estilo ERP) -->
        <aside class="app-sidebar" id="app-sidebar">
          <div class="sidebar-brand">
            <i class="ph ph-video-camera"></i>
            <span>ProDuccion</span>
          </div>

          <!-- Perfil del Usuario en el Sidebar -->
          <div class="sidebar-profile">
            <div class="profile-avatar">
              <i class="ph ph-user-circle"></i>
            </div>
            <div class="profile-info">
              <span class="profile-name" title="${profile.nombre_completo}">${profile.nombre_completo}</span>
              <span class="profile-role" style="background-color: ${rolInfo.color}; color: #000;">${rolInfo.label}</span>
            </div>
          </div>

          <!-- Menú de Navegación Vertical -->
          <nav class="sidebar-menu">
            <button class="sidebar-link ${activeTab === 'home' ? 'active' : ''}" data-tab="home">
              <i class="ph ph-house"></i> <span>Inicio</span>
            </button>
            ${['superadmin', 'superleader', 'leader', 'coleader'].includes(profile.rol) ? `
              <button class="sidebar-link ${activeTab === 'events' ? 'active' : ''}" data-tab="events">
                <i class="ph ph-calendar-blank"></i> <span>Servicios</span>
              </button>
            ` : ''}
            <button class="sidebar-link ${activeTab === 'schedule' ? 'active' : ''}" data-tab="schedule">
              <i class="ph ph-clock"></i> <span>Mi Disponibilidad</span>
            </button>
            <button class="sidebar-link ${activeTab === 'areas' ? 'active' : ''}" data-tab="areas">
              <i class="ph ph-users-three"></i> <span>Áreas</span>
            </button>
            ${['superadmin', 'superleader', 'leader', 'coleader'].includes(profile.rol) ? `
              <button class="sidebar-link ${activeTab === 'users' ? 'active' : ''}" data-tab="users">
                <i class="ph ph-shield-check"></i> <span>Integrantes</span>
              </button>
            ` : ''}
          </nav>

          <!-- Botón Cerrar Sesión en la parte inferior -->
          <div class="sidebar-footer">
            <button class="btn-logout-sidebar" id="btn-logout" title="Cerrar Sesión">
              <i class="ph ph-sign-out"></i>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        <!-- Contenedor del Contenido Principal -->
        <div class="main-content-wrapper">
          <main class="dashboard-container" id="dashboard-content">
            <!-- El contenido dinámico se inyectará aquí -->
          </main>
        </div>
      </div>
    `;

    // Event listeners de navegación
    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        activeTab = tab;
        renderLayout();
      });
    });

    // Control del menú móvil (Sidebar lateral)
    const sidebar = document.getElementById('app-sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar && sidebarOverlay) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('visible');
      });

      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('visible');
      });
    }

    // Botón de cerrar sesión
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await supabase.auth.signOut();
      showToast('Sesión cerrada correctamente.', 'info');
      onLogout();
    });

    // Inyectar la pestaña activa
    const contentArea = document.getElementById('dashboard-content');
    if (activeTab === 'home') {
      renderHome(contentArea);
    } else if (activeTab === 'events') {
      if (['superadmin', 'superleader', 'leader', 'coleader'].includes(profile.rol)) {
        renderEventsView(contentArea, profile);
      } else {
        activeTab = 'home';
        renderHome(contentArea);
      }
    } else if (activeTab === 'schedule') {
      renderScheduleView(contentArea, profile);
    } else if (activeTab === 'areas') {
      renderAreas(contentArea);
    } else if (activeTab === 'users') {
      renderUsers(contentArea);
    }
  };

  // --- SUBVISTA: INICIO / HOME ---
  const renderHome = async (contentArea) => {
    contentArea.innerHTML = `
      <div class="dashboard-header">
        <h2 class="dashboard-title">¡Hola, ${profile.nombre_completo}!</h2>
        <p class="dashboard-subtitle">Bienvenido al portal de coordinación del equipo de ProDuccion.</p>
      </div>

      <div class="dashboard-grid">
        <div class="grid-col-main" style="display: flex; flex-direction: column; gap: 2rem;">
          
          <!-- Mis próximas asignaciones (Solo para NO-SuperAdmins) -->
          ${profile.rol !== 'superadmin' ? `
            <div class="card" id="card-my-assignments">
              <div class="card-header">
                <h3 class="card-title"><i class="ph ph-identification-card"></i> Mis Próximos Servicios</h3>
              </div>
              <div class="table-wrapper">
                <p style="color: var(--text-secondary); text-align: center; padding: 1.5rem;" id="my-assignments-loading">Cargando tus asignaciones...</p>
              </div>
            </div>
          ` : `
            <!-- Panel de Disponibilidad Reciente para el SuperAdmin -->
            <div class="card" id="card-admin-availability">
              <div class="card-header">
                <h3 class="card-title"><i class="ph ph-calendar-check"></i> Siervos Disponibles para Asignación</h3>
              </div>
              <div class="table-wrapper">
                <p style="color: var(--text-secondary); text-align: center; padding: 1.5rem;" id="admin-availability-loading">Cargando disponibilidad de siervos...</p>
              </div>
            </div>
          `}

          <!-- Servicios programados de la semana -->
          <div class="card" id="card-weekly-events">
            <div class="card-header">
              <h3 class="card-title"><i class="ph ph-calendar"></i> Próximos Servicios en ProDuccion</h3>
            </div>
            <div class="table-wrapper">
              <p style="color: var(--text-secondary); text-align: center; padding: 1.5rem;" id="weekly-events-loading">Cargando eventos...</p>
            </div>
          </div>
        </div>

        <div class="grid-col-sidebar" style="display: flex; flex-direction: column; gap: 2rem;">
          <!-- Resumen del perfil / áreas a las que pertenece o áreas generales -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="ph ph-users"></i> ${profile.rol === 'superadmin' ? 'Áreas de Servicio' : 'Mis Áreas de Servicio'}</h3>
            </div>
            <div id="my-areas-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
              <p style="color: var(--text-muted); font-size: 0.9rem;">Cargando áreas...</p>
            </div>
          </div>

          <!-- Info de horarios de ProDuccion -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="ph ph-clock"></i> Horarios Generales</h3>
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary);">
              <p><strong>Domingos:</strong></p>
              <ul style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: square;">
                <li>08:00 AM - Culto de Adoración</li>
                <li>11:00 AM - Culto General</li>
                <li>01:00 PM - Culto de Jóvenes</li>
                <li>07:00 PM - Culto General</li>
              </ul>
              <p><strong>Miércoles:</strong></p>
              <ul style="margin-left: 1.5rem; list-style-type: square;">
                <li>07:30 PM - Servicio de Oración</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    // Cargar Datos Asíncronos de forma condicional
    if (profile.rol !== 'superadmin') {
      loadMyAssignments();
    } else {
      loadAdminAvailability();
    }
    loadWeeklyEvents();
    loadMyAreas();
  };

  // Cargar asignaciones del usuario activo
  const loadMyAssignments = async () => {
    const listContainer = document.getElementById('card-my-assignments').querySelector('.table-wrapper');
    try {
      const { data, error } = await supabase
        .from('asignaciones')
        .select(`
          id,
          rol_en_evento,
          estado,
          eventos (id, titulo, fecha_hora, tipo),
          areas (nombre)
        `)
        .eq('usuario_id', profile.id)
        .order('creado_en', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="ph ph-calendar-x" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
            No tienes asignaciones de servicio próximas. 
            <p style="font-size: 0.85rem; margin-top: 0.5rem;">Ve a la pestaña <strong>"Mi Disponibilidad"</strong> para agendar días de servicio.</p>
          </div>
        `;
        return;
      }

      let rowsHtml = '';
      data.forEach(asig => {
        const ev = asig.eventos;
        const area = asig.areas;
        
        let confirmBtn = '';
        let badgeClass = 'badge-warning';
        let estadoText = 'Pendiente';

        if (asig.estado === 'confirmado') {
          badgeClass = 'badge-success';
          estadoText = 'Confirmado';
        } else if (asig.estado === 'rechazado') {
          badgeClass = 'badge-danger';
          estadoText = 'Rechazado';
        } else {
          // Si está pendiente, dar opción de confirmar o rechazar
          confirmBtn = `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn-secondary btn-asig-confirm" data-id="${asig.id}" style="padding: 2px 8px; font-size: 0.75rem; border-color: var(--color-success); color: var(--color-success);">Confirmar</button>
              <button class="btn-secondary btn-asig-reject" data-id="${asig.id}" style="padding: 2px 8px; font-size: 0.75rem; border-color: var(--color-danger); color: var(--color-danger);">Declinar</button>
            </div>
          `;
        }

        rowsHtml += `
          <tr>
            <td>
              <strong>${ev.titulo}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${SERVICE_TYPES[ev.tipo]}</div>
            </td>
            <td>${formatDateTime(ev.fecha_hora)}</td>
            <td><span class="badge badge-info">${area ? area.nombre : 'Sin Área'}</span></td>
            <td>${asig.rol_en_evento}</td>
            <td>
              <span class="badge ${badgeClass}">${estadoText}</span>
              ${confirmBtn}
            </td>
          </tr>
        `;
      });

      listContainer.innerHTML = `
        <table class="custom-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Fecha y Hora</th>
              <th>Área</th>
              <th>Rol</th>
              <th>Confirmación</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      // Eventos para confirmar/rechazar asignaciones
      listContainer.querySelectorAll('.btn-asig-confirm').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await updateAssignmentStatus(id, 'confirmado');
        });
      });

      listContainer.querySelectorAll('.btn-asig-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await updateAssignmentStatus(id, 'rechazado');
        });
      });

    } catch (err) {
      listContainer.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 1.5rem;">Error: ${err.message}</p>`;
    }
  };

  // Función para actualizar estado de confirmación
  const updateAssignmentStatus = async (asigId, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('asignaciones')
        .update({ estado: nuevoEstado })
        .eq('id', asigId);

      if (error) throw error;
      showToast(`Servicio ${nuevoEstado === 'confirmado' ? 'confirmado' : 'declinado'} exitosamente.`, 'success');
      loadMyAssignments();
    } catch (err) {
      showToast('Error al actualizar asignación: ' + err.message, 'error');
    }
  };

  // Cargar disponibilidad global de los siervos para el SuperAdmin
  const loadAdminAvailability = async () => {
    const listContainer = document.getElementById('card-admin-availability').querySelector('.table-wrapper');
    try {
      const { data, error } = await supabase
        .from('disponibilidad')
        .select(`
          id,
          dia_semana,
          fecha,
          creado_en,
          usuarios (id, nombre_completo, email, telefono, rol)
        `)
        .order('creado_en', { ascending: false });

      if (error) throw error;

      // Filtrar para ocultar a los SuperAdmins (para que no aparezca el propio admin en su lista de siervos disponibles)
      const filteredData = data ? data.filter(d => d.usuarios && d.usuarios.rol !== 'superadmin') : [];

      if (filteredData.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="ph ph-calendar-blank" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
            Ningún siervo ha registrado su disponibilidad aún.
          </div>
        `;
        return;
      }

      let rowsHtml = '';
      filteredData.forEach(item => {
        const u = item.usuarios;
        const phone = u.telefono || '<span style="color: var(--text-muted);">Sin teléfono</span>';
        
        let availableText = '';
        if (item.dia_semana === 'domingo') {
          availableText = '<span class="badge badge-success">Domingo (General)</span>';
        } else if (item.dia_semana === 'miercoles') {
          availableText = '<span class="badge badge-info">Miércoles (Oración)</span>';
        } else {
          availableText = `<span class="badge badge-warning">Fecha: ${formatDate(item.fecha)}</span>`;
        }

        rowsHtml += `
          <tr>
            <td>
              <strong>${u.nombre_completo}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${u.email}</div>
            </td>
            <td>${phone}</td>
            <td>${availableText}</td>
            <td>${formatDateTime(item.creado_en)}</td>
            <td>
              <button class="btn-primary btn-assign-from-home" data-user-id="${u.id}" data-user-name="${u.nombre_completo}" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; width: auto; display: inline-flex; align-items: center; gap: 0.25rem;">
                <i class="ph ph-plus-circle"></i> Asignar
              </button>
            </td>
          </tr>
        `;
      });

      listContainer.innerHTML = `
        <table class="custom-table">
          <thead>
            <tr>
              <th>Siervo</th>
              <th>Teléfono</th>
              <th>Disponibilidad Declarada</th>
              <th>Fecha de Registro</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      // Event listener para asignar directamente
      listContainer.querySelectorAll('.btn-assign-from-home').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeTab = 'events';
          renderLayout();
          showToast('Redirigiendo a Servicios. Selecciona un culto para asignar a este siervo.', 'info');
        });
      });

    } catch (err) {
      listContainer.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 1.5rem;">Error: ${err.message}</p>`;
    }
  };

  // Cargar eventos semanales generales
  const loadWeeklyEvents = async () => {
    const container = document.getElementById('card-weekly-events').querySelector('.table-wrapper');
    try {
      // Traer los siguientes 6 eventos
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .gte('fecha_hora', new Date().toISOString())
        .order('fecha_hora', { ascending: true })
        .limit(6);

      if (error) throw error;

      if (!data || data.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No hay servicios programados en el calendario próximo.</p>`;
        return;
      }

      let rowsHtml = '';
      data.forEach(ev => {
        rowsHtml += `
          <tr>
            <td><strong>${ev.titulo}</strong></td>
            <td>${SERVICE_TYPES[ev.tipo] || ev.tipo}</td>
            <td>${formatDateTime(ev.fecha_hora)}</td>
            <td>
              <button class="btn-secondary btn-view-event-detail" data-id="${ev.id}" style="padding: 2px 8px; font-size: 0.8rem;">
                Ver Equipo
              </button>
            </td>
          </tr>
        `;
      });

      container.innerHTML = `
        <table class="custom-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Tipo</th>
              <th>Fecha y Hora</th>
              <th>Equipo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      container.querySelectorAll('.btn-view-event-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          activeTab = 'events';
          renderLayout();
          // Intentar abrir el detalle directamente (se maneja en events.js al cargar)
          setTimeout(() => {
            const evCard = document.querySelector(`.event-card[data-id="${id}"]`);
            if (evCard) {
              evCard.scrollIntoView({ behavior: 'smooth' });
              evCard.querySelector('.btn-view-team')?.click();
            }
          }, 400);
        });
      });

    } catch (err) {
      container.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 1.5rem;">Error: ${err.message}</p>`;
    }
  };

  // Cargar áreas a las que pertenece el integrante o áreas generales
  const loadMyAreas = async () => {
    const list = document.getElementById('my-areas-list');
    try {
      if (profile.rol === 'superadmin') {
        // Cargar todas las áreas generales para el SuperAdmin
        const { data, error } = await supabase
          .from('areas')
          .select('nombre, descripcion')
          .order('nombre');

        if (error) throw error;

        if (!data || data.length === 0) {
          list.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">No hay áreas de servicio creadas.</p>`;
          return;
        }

        let html = '';
        data.forEach(area => {
          html += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 0.75rem; border-radius: var(--border-radius-sm);">
              <strong style="color: var(--primary); font-size: 0.9rem;">${area.nombre}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">${area.descripcion || 'Sin descripción'}</div>
            </div>
          `;
        });
        list.innerHTML = html;
        return;
      }

      // Para los demás usuarios, cargar solo sus áreas inscritas
      const { data, error } = await supabase
        .from('miembros_areas')
        .select(`
          area_id,
          es_lider_principal,
          areas (nombre, descripcion)
        `)
        .eq('usuario_id', profile.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = `
          <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">
            Aún no estás inscrito en ninguna área de servicio.
          </p>
          <button class="btn-secondary" id="btn-join-area-home" style="width: 100%; justify-content: center;">
            <i class="ph ph-plus"></i> Inscribirse en un Área
          </button>
        `;
        document.getElementById('btn-join-area-home')?.addEventListener('click', () => {
          activeTab = 'areas';
          renderLayout();
        });
        return;
      }

      let html = '';
      data.forEach(m => {
        const area = m.areas;
        html += `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 0.75rem; border-radius: var(--border-radius-sm); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 0.95rem;">${area.nombre}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${area.descripcion || 'Sin descripción'}</div>
            </div>
            ${m.es_lider_principal ? '<span class="badge badge-warning">Líder</span>' : '<span class="badge badge-info">Siervo</span>'}
          </div>
        `;
      });
      list.innerHTML = html;

    } catch (err) {
      list.innerHTML = `<p style="color: var(--color-danger); font-size: 0.85rem;">Error: ${err.message}</p>`;
    }
  };

  // --- SUBVISTA: GESTIÓN DE ÁREAS ---
  const renderAreas = async (contentArea) => {
    contentArea.innerHTML = `
      <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 class="dashboard-title">Áreas de Producción</h2>
          <p class="dashboard-subtitle">Visualiza las áreas de servicio y únete a los equipos de producción.</p>
        </div>
        ${['superadmin', 'superleader'].includes(profile.rol) ? `
          <button class="btn-primary" id="btn-create-area" style="width: auto;">
            <i class="ph ph-plus-circle"></i> Nueva Área
          </button>
        ` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;" id="areas-grid-container">
        <p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1; padding: 2rem;">Cargando áreas de servicio...</p>
      </div>
    `;

    // Cargar áreas
    const grid = document.getElementById('areas-grid-container');
    
    const loadAreasData = async () => {
      try {
        const { data: areasList, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('nombre');

        if (areasError) throw areasError;

        // Traer membresías del usuario
        const { data: myMemberships, error: memError } = await supabase
          .from('miembros_areas')
          .select('area_id, es_lider_principal')
          .eq('usuario_id', profile.id);

        if (memError) throw memError;

        const myMembershipMap = new Map(myMemberships.map(m => [m.area_id, m]));

        // Traer TODOS los miembros de todas las áreas (incluyendo su rol para ocultar superadmins)
        const { data: allMembers, error: allMembersError } = await supabase
          .from('miembros_areas')
          .select(`
            area_id,
            usuario_id,
            es_lider_principal,
            usuarios (nombre_completo, rol)
          `);

        if (allMembersError) throw allMembersError;

        const membersByArea = {};
        allMembers.forEach(m => {
          if (!membersByArea[m.area_id]) {
            membersByArea[m.area_id] = [];
          }
          membersByArea[m.area_id].push(m);
        });

        if (!areasList || areasList.length === 0) {
          grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
              <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem; display: block;"></i>
              No hay áreas de servicio configuradas actualmente.
              ${profile.rol === 'superleader' ? '<p style="margin-top:0.5rem;">Crea tu primera área haciendo clic en "Nueva Área".</p>' : ''}
            </div>
          `;
          return;
        }

        grid.innerHTML = '';
        areasList.forEach(area => {
          const isMember = myMembershipMap.has(area.id);
          const membership = myMembershipMap.get(area.id);
          const isLider = membership?.es_lider_principal;
          
          const areaMembers = membersByArea[area.id] || [];
          let membersHtml = '';
          
          // Filtrar miembros para ocultar a los SuperAdmins en el listado de integrantes del área
          const visibleMembers = areaMembers.filter(m => m.usuarios && m.usuarios.rol !== 'superadmin');

          if (visibleMembers.length === 0) {
            membersHtml = `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic; display: block; margin-top: 0.5rem; margin-bottom: 1rem;">Sin integrantes inscritos</span>`;
          } else {
            membersHtml = `
              <div class="area-members-list" style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 0.75rem; margin-bottom: 1rem;">
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Integrantes:</div>
                ${visibleMembers.map(m => {
                  const name = m.usuarios?.nombre_completo || 'Siervo Desconocido';
                  const isAreaLider = m.es_lider_principal;
                  
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <i class="ph ${isAreaLider ? 'ph-crown' : 'ph-user'}" style="color: ${isAreaLider ? 'var(--primary)' : 'var(--text-secondary)'};"></i>
                        <span>${name}</span>
                        ${isAreaLider ? '<span class="badge badge-warning" style="font-size: 0.65rem; padding: 0.1rem 0.3rem; margin-left: 0.25rem;">Líder</span>' : ''}
                      </div>
                      ${['superadmin', 'superleader'].includes(profile.rol) ? `
                        <button class="btn-toggle-area-leader" data-area-id="${area.id}" data-user-id="${m.usuario_id}" data-is-lider="${isAreaLider}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; width: auto; background: ${isAreaLider ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'}; color: ${isAreaLider ? 'var(--color-danger)' : 'var(--primary)'}; border: 1px solid ${isAreaLider ? 'var(--color-danger)' : 'var(--primary)'}; border-radius: 4px; cursor: pointer;" title="${isAreaLider ? 'Quitar liderazgo' : 'Hacer líder de área'}">
                          ${isAreaLider ? 'Hacer Siervo' : 'Hacer Líder'}
                        </button>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }
          
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `
            <div class="card-header" style="margin-bottom: 0.5rem; padding-bottom: 0.5rem;">
              <h3 class="card-title"><i class="ph ph-users-three"></i> ${area.nombre}</h3>
              ${isMember 
                ? (isLider ? '<span class="badge badge-warning">Líder</span>' : '<span class="badge badge-success">Miembro</span>') 
                : '<span class="badge badge-danger">Fuera</span>'
              }
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; min-height: 40px;">
              ${area.descripcion || 'Sin descripción disponible.'}
            </p>
            ${membersHtml}
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              ${['superadmin', 'superleader'].includes(profile.rol) ? `
                <button class="btn-danger btn-delete-area" data-id="${area.id}" style="padding: 0.4rem; font-size: 1.1rem; display: flex; align-items: center; justify-content: center;" title="Eliminar Área">
                  <i class="ph ph-trash"></i>
                </button>
              ` : ''}
              ${isMember ? `
                <button class="btn-secondary btn-leave-area" data-id="${area.id}" style="border-color: var(--color-danger); color: var(--color-danger);">
                  Salir del Área
                </button>
              ` : `
                <button class="btn-primary btn-join-area" data-id="${area.id}" style="width: auto; padding: 0.4rem 1rem;">
                  Unirse
                </button>
              `}
            </div>
          `;
          grid.appendChild(card);
        });

        // Event listeners para unirse/salir
        grid.querySelectorAll('.btn-join-area').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const areaId = e.target.getAttribute('data-id');
            await joinArea(areaId);
          });
        });

        grid.querySelectorAll('.btn-leave-area').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const areaId = e.target.getAttribute('data-id');
            await leaveArea(areaId);
          });
        });

        grid.querySelectorAll('.btn-delete-area').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const areaId = e.currentTarget.getAttribute('data-id');
            if (confirm('¿Estás seguro de eliminar esta área de servicio? Esto eliminará también todas sus membresías y asignaciones asociadas.')) {
              await deleteArea(areaId);
            }
          });
        });

        // Event listeners para hacer líder / quitar líder de área
        grid.querySelectorAll('.btn-toggle-area-leader').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const areaId = e.currentTarget.getAttribute('data-area-id');
            const userId = e.currentTarget.getAttribute('data-user-id');
            const isCurrentlyLider = e.currentTarget.getAttribute('data-is-lider') === 'true';
            
            await toggleAreaLeader(areaId, userId, !isCurrentlyLider);
          });
        });

      } catch (err) {
        grid.innerHTML = `<p style="color: var(--color-danger); text-align: center; grid-column: 1/-1;">Error al cargar áreas: ${err.message}</p>`;
      }
    };

    const toggleAreaLeader = async (areaId, userId, makeLider) => {
      try {
        const { error } = await supabase
          .from('miembros_areas')
          .update({ es_lider_principal: makeLider })
          .eq('area_id', areaId)
          .eq('usuario_id', userId);

        if (error) throw error;

        showToast(
          makeLider 
            ? 'Asignado como líder de área con éxito' 
            : 'Removido de líder de área con éxito', 
          'success'
        );
        
        loadAreasData();
      } catch (err) {
        showToast('Error al modificar liderazgo: ' + err.message, 'error');
      }
    };

    const joinArea = async (areaId) => {
      try {
        const { error } = await supabase
          .from('miembros_areas')
          .insert({
            usuario_id: profile.id,
            area_id: areaId,
            es_lider_principal: false
          });

        if (error) throw error;
        showToast('Te has unido al área correctamente.', 'success');
        loadAreasData();
      } catch (err) {
        showToast('Error al unirse al área: ' + err.message, 'error');
      }
    };

    const leaveArea = async (areaId) => {
      try {
        const { error } = await supabase
          .from('miembros_areas')
          .delete()
          .eq('usuario_id', profile.id)
          .eq('area_id', areaId);

        if (error) throw error;
        showToast('Has salido del área.', 'info');
        loadAreasData();
      } catch (err) {
        showToast('Error al salir del área: ' + err.message, 'error');
      }
    };

    const deleteArea = async (areaId) => {
      try {
        const { error } = await supabase
          .from('areas')
          .delete()
          .eq('id', areaId);

        if (error) throw error;
        showToast('Área eliminada exitosamente.', 'success');
        loadAreasData();
      } catch (err) {
        showToast('Error al eliminar área: ' + err.message, 'error');
      }
    };

    loadAreasData();

    // Crear nueva área (Solo Superlíderes)
    document.getElementById('btn-create-area')?.addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Nueva Área de Servicio</h3>
            <button class="btn-logout" id="btn-close-modal"><i class="ph ph-x"></i></button>
          </div>
          <form id="create-area-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="area-nombre">Nombre del Área</label>
                <input type="text" id="area-nombre" class="form-input" placeholder="Ej: Sonido, Luces, Cámaras..." required style="padding-left: 1rem;" />
              </div>
              <div class="form-group">
                <label class="form-label" for="area-descripcion">Descripción / Función</label>
                <textarea id="area-descripcion" class="form-input" placeholder="Detalla la función de este equipo..." style="padding-left: 1rem; height: 100px; resize: none;"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="btn-cancel-area">Cancelar</button>
              <button type="submit" class="btn-primary" style="width: auto;">Crear Área</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      document.getElementById('btn-close-modal').addEventListener('click', closeModal);
      document.getElementById('btn-cancel-area').addEventListener('click', closeModal);

      document.getElementById('create-area-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('area-nombre').value.trim();
        const descripcion = document.getElementById('area-descripcion').value.trim();

        try {
          const { error } = await supabase
            .from('areas')
            .insert({ nombre, descripcion });

          if (error) throw error;

          showToast('Área creada exitosamente.', 'success');
          closeModal();
          loadAreasData();
        } catch (err) {
          showToast('Error al crear área: ' + err.message, 'error');
        }
      });
    });
  };

  // --- SUBVISTA: GESTIÓN DE INTEGRANTES / USUARIOS (Solo Superlíderes) ---
  const renderUsers = async (contentArea) => {
    contentArea.innerHTML = `
      <div class="dashboard-header">
        <h2 class="dashboard-title">Integrantes del Equipo</h2>
        <p class="dashboard-subtitle">Gestiona los roles y accesos de los integrantes de ProDuccion.</p>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="custom-table" id="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Teléfono</th>
                <th>Rol Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Cargando integrantes...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const tableBody = document.getElementById('users-table').querySelector('tbody');

    const loadUsersData = async () => {
      try {
        let usersList = [];

        if (profile.rol === 'superadmin') {
          // El SuperAdmin ve a todos excepto a los SuperAdmins (los cuales son invisibles)
          const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .neq('rol', 'superadmin')
            .order('nombre_completo');

          if (error) throw error;
          usersList = data || [];
        } else {
          // Superlíderes, líderes y co-líderes solo controlan a los siervos de sus propias áreas
          // 1. Obtener las áreas del líder actual
          const { data: myAreas, error: myAreasError } = await supabase
            .from('miembros_areas')
            .select('area_id')
            .eq('usuario_id', profile.id);

          if (myAreasError) throw myAreasError;

          if (!myAreas || myAreas.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No estás asignado a ninguna área, no tienes siervos que puedas gestionar.</td></tr>`;
            return;
          }

          const areaIds = myAreas.map(a => a.area_id);

          // 2. Obtener los IDs de los miembros de esas áreas
          const { data: members, error: membersError } = await supabase
            .from('miembros_areas')
            .select('usuario_id')
            .in('area_id', areaIds);

          if (membersError) throw membersError;

          const userIds = [...new Set(members.map(m => m.usuario_id))];

          if (userIds.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay integrantes en tus áreas.</td></tr>`;
            return;
          }

          // 3. Obtener los perfiles de los usuarios que son 'servant' y están en esas áreas
          const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .in('id', userIds)
            .eq('rol', 'servant')
            .order('nombre_completo');

          if (error) throw error;
          usersList = data || [];
        }

        if (!usersList || usersList.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No hay siervos registrados en tus áreas de servicio.</td></tr>`;
          return;
        }

        let html = '';
        usersList.forEach(u => {
          const isSelf = u.id === profile.id;
          const rolSelected = u.rol;

          let selectOptions = '';
          if (profile.rol === 'superadmin') {
            selectOptions = `
              <option value="servant" ${rolSelected === 'servant' ? 'selected' : ''}>Siervo</option>
              <option value="coleader" ${rolSelected === 'coleader' ? 'selected' : ''}>Co-líder</option>
              <option value="leader" ${rolSelected === 'leader' ? 'selected' : ''}>Líder</option>
              <option value="superleader" ${rolSelected === 'superleader' ? 'selected' : ''}>Superlíder</option>
            `;
          } else {
            // Líderes y Co-líderes solo pueden promover siervos de sus áreas a co-líder o líder
            selectOptions = `
              <option value="servant" ${rolSelected === 'servant' ? 'selected' : ''}>Siervo</option>
              <option value="coleader" ${rolSelected === 'coleader' ? 'selected' : ''}>Co-líder</option>
              <option value="leader" ${rolSelected === 'leader' ? 'selected' : ''}>Líder</option>
            `;
          }

          html += `
            <tr>
              <td><strong>${u.nombre_completo}</strong> ${isSelf ? ' <span style="font-size:0.75rem; color: var(--text-muted);">(Tú)</span>' : ''}</td>
              <td>${u.email}</td>
              <td>${u.telefono || '<span style="color: var(--text-muted);">Sin teléfono</span>'}</td>
              <td>
                <span class="badge" style="background-color: ${ROLES[u.rol]?.color || '#fff'}; color: #000; font-weight: 700;">
                  ${ROLES[u.rol]?.label || u.rol}
                </span>
              </td>
              <td>
                ${isSelf ? '<span style="color: var(--text-muted); font-size: 0.85rem;">Bloqueado</span>' : `
                  <select class="form-input select-change-role" data-id="${u.id}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.8rem; display: inline-block;">
                    ${selectOptions}
                  </select>
                `}
              </td>
            </tr>
          `;
        });

        tableBody.innerHTML = html;

        // Añadir events para cambiar rol
        tableBody.querySelectorAll('.select-change-role').forEach(select => {
          select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const newRole = e.target.value;
            await updateMemberRole(id, newRole);
          });
        });

      } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-danger);">Error: ${err.message}</td></tr>`;
      }
    };

    const updateMemberRole = async (userId, newRole) => {
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ rol: newRole })
          .eq('id', userId);

        if (error) throw error;
        showToast('Rol de integrante actualizado.', 'success');
        loadUsersData();
      } catch (err) {
        showToast('Error al cambiar rol: ' + err.message, 'error');
      }
    };

    loadUsersData();
  };

  // Inicializar vista
  renderLayout();
}
