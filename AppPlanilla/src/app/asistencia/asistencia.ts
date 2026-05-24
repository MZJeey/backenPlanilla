import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface ControlAsistencia {
  idControlAsistencia: number;
  idEmpleados: number;
  nombreEmpleado: string;
  HoraEntrada: string;
  HoraSalida: string;
  estado: string;
  observacion?: string;
  idUsuarios?: number;
  fecha: string | null;
}

interface Empleado {
  idEmpleado: number;
  Nombre: string;
  Apellidos: string;
}

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.css',
})
export class Asistencia implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);

  private readonly router = inject(Router);

  private readonly API_URL = 'https://backenplanilla-production.up.railway.app/';
  private readonly ASISTENCIA_URL = `${this.API_URL}/ControlAsistenciaServicio/`;
  private readonly EMPLEADO_URL = `${this.API_URL}/EmpleadoServicio/`;
  private readonly TZ = 'America/Costa_Rica';

  protected readonly Registros = signal<ControlAsistencia[]>([]);
  protected readonly Empleados = signal<Empleado[]>([]);

  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
  readonly perPage = 8;

  // ── Modales ──
  showFormModal = false;
  showMarcaModal = false;
  showDeleteModal = false;

  // ── Filtros ──
  searchQuery = '';
  fechaFiltro = '';
  estadoFiltro = '';

  // ── Paginación ──
  currentPage = 1;

  // ── Form ──
  editId: number | null = null;
  form: Partial<ControlAsistencia> = {};

  // ── Marca ──
  marcaEmpleadoId: number | string = '';
  horaActual = '';
  fechaActual = '';
  private clockInterval: any;

  // ── Eliminar ──
  deleteTargetId: number | null = null;

  // ── Helpers zona horaria CR ──
  private hoyCR(): string {
    // en-CA devuelve YYYY-MM-DD, ideal para comparaciones con la BD
    return new Date().toLocaleDateString('en-CA', { timeZone: this.TZ });
  }

  private ahoraCR(): string {
    return new Date().toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: this.TZ
    });
  }

  ngOnInit() {
    this.actualizarReloj();
    this.clockInterval = setInterval(() => this.actualizarReloj(), 1000);
    this.fechaFiltro = '';
    this.getEmpleados();
    this.getRegistros();
  }

  ngOnDestroy() {
    clearInterval(this.clockInterval);
  }

  private actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: this.TZ   // ✅ forzado a CR
    });
    this.fechaActual = now.toLocaleDateString('es-CR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: this.TZ   // ✅ forzado a CR
    });
  }

  // ── HTTP GET ──
  getRegistros(): void {
    this.http.get<any[]>(`${this.ASISTENCIA_URL}listarControlAsistencia`).subscribe({
      next: (data) => {
        const empleados = this.Empleados();
        const mapped: ControlAsistencia[] = data.map(r => {
          const emp = empleados.find(e => e.idEmpleado === r.idEmpleados);
          

//       let fechaLimpia = r.Fecha || r.fecha;

// if (fechaLimpia) {
//   fechaLimpia = String(fechaLimpia).split('T')[0].split(' ')[0];
// }

const fechaLimpia = this.limpiarFechaBD(r.Fecha || r.fecha);


          return {
            ...r,
            nombreEmpleado: emp ? `${emp.Nombre} ${emp.Apellidos}` : '—',
            fecha: fechaLimpia || null,
           estado: this.calcularEstado(r.HoraEntrada, r.HoraSalida)
          };
        });
        this.Registros.set(mapped);
      },
      error: (err) => console.error('Error al obtener registros:', err)
    });
  }

private limpiarFechaBD(fecha: any): string | null {
  if (!fecha) return null;

  const texto = String(fecha);

  return texto.split('T')[0].split(' ')[0];
}





calcularEstado(entrada: string, salida: string): string {
  if (entrada && salida) return 'Presente';
  if (entrada && !salida) return 'Pendiente salida';
  return 'Ausente';
}





  getEmpleados(): void {
    this.http.get<Empleado[]>(`${this.EMPLEADO_URL}listarEmpleados`).subscribe({
      next: (data) => this.Empleados.set(data),
      error: (err) => console.error('Error al obtener empleados:', err)
    });
  }

  // ── HTTP POST ──
  crearRegistro(registro: Partial<ControlAsistencia>): void {
    const body = {
      HoraEntrada: registro.HoraEntrada,
      HoraSalida: registro.HoraSalida || null,  // ✅ vacío/undefined → null
      idEmpleados: registro.idEmpleados,
      idUsuarios: registro.idUsuarios ?? 1,
      Fecha: registro.fecha || this.hoyCR()                   // ✅ F mayúscula para el backend
    };
  console.log('BODY QUE SE ENVÍA:', body);

    this.http.post(`${this.ASISTENCIA_URL}insertar`, body).subscribe({
      next: () => this.getRegistros(),
      error: (err) => console.error('Error al crear registro:', err)
    });
  }

  // ── HTTP PUT ──
  actualizarRegistro(registro: Partial<ControlAsistencia>): void {
    const body = {
      idControlAsistencia: registro.idControlAsistencia,
      HoraEntrada: registro.HoraEntrada,
      HoraSalida: registro.HoraSalida || null,  // ✅ vacío/undefined → null
      idEmpleados: registro.idEmpleados,
      idUsuarios: registro.idUsuarios ?? 1,     // ✅ nunca undefined
      Fecha: registro.fecha                     // ✅ F mayúscula para el backend
    };

    this.http.put(`${this.ASISTENCIA_URL}actualizar`, body).subscribe({
      next: () => this.getRegistros(),
      error: (err) => console.error('Error al actualizar registro:', err)
    });
  }

  // ── HTTP DELETE ──
  eliminarRegistro(id: number): void {
    this.http.delete(`${this.ASISTENCIA_URL}eliminar`, { params: { id } }).subscribe({
      next: () => this.getRegistros(),
      error: (err) => console.error('Error al eliminar registro:', err)
    });
  }

  // ── Computed ──
  get filteredRegistros(): ControlAsistencia[] {
    const q = this.searchQuery.toLowerCase();
    const f = this.fechaFiltro;

    return this.Registros().filter(r => {
      const coincideNombre = !q || r.nombreEmpleado?.toLowerCase().includes(q);
      const coincideEstado = !this.estadoFiltro || r.estado === this.estadoFiltro;
      const coincideFecha = !f || r.fecha === f;
      return coincideNombre && coincideEstado && coincideFecha;
    });
  }

  get pageSlice(): ControlAsistencia[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredRegistros.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredRegistros.length / this.perPage) || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  // ── Helpers ──
  min(a: number, b: number) { return Math.min(a, b); }

  inicialesNombre(nombre: string) {
    if (!nombre || nombre === '—') return '?';
    const partes = nombre.split(' ');
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  colorFor(id: number) { return this.COLORS[(id - 1) % this.COLORS.length]; }

  fmtFecha(f: string | null) {
    if (!f) return 'Sin fecha';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  }

  calcularHoras(entrada: string, salida: string): string {
    if (!entrada || !salida) return '—';
    const [eh, em] = entrada.split(':').map(Number);
    const [sh, sm] = salida.split(':').map(Number);
    const minutos = (sh * 60 + sm) - (eh * 60 + em);
    if (minutos <= 0) return '—';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  estadoClass(s: string) {
    if (s === 'Presente') return 'status-active';
    if (s === 'Tardanza') return 'status-tardanza';
    if (s === 'Permiso')  return 'status-vacation';
    return 'status-inactive';
  }

  countByEstado(estado: string) {
    const hoy = this.hoyCR(); // ✅ fecha CR
    return this.Registros().filter(r => r.fecha === hoy && r.estado === estado).length;
  }

  getPorcentaje() {
    const hoy = this.hoyCR(); // ✅ fecha CR
    const hoyRegistros = this.Registros().filter(r => r.fecha === hoy);
    if (!hoyRegistros.length) return 0;
    const presentes = hoyRegistros.filter(r => r.estado === 'Presente' || r.estado === 'Tardanza').length;
    return Math.round((presentes / hoyRegistros.length) * 100);
  }

  // ── Filtro / paginación ──
  filterTable() { this.currentPage = 1; }

  changePage(d: number) {
    const max = this.totalPages.length;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }

  goPage(n: number) { this.currentPage = n; }

  get visiblePages(): (number | '...')[] {
  const total = this.totalPages.length;
  const current = this.currentPage;
  const pages: (number | '...')[] = [];

  if (total <= 5) {
    // Si hay pocas páginas, muéstralas todas
    return this.totalPages;
  }

  // Siempre muestra la primera
  pages.push(1);

  // Puntos suspensivos izquierda
  if (current > 3) pages.push('...');

  // Páginas alrededor de la actual
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }

  // Puntos suspensivos derecha
  if (current < total - 2) pages.push('...');

  // Siempre muestra la última
  pages.push(total);

  return pages;
}
  onEmpleadoChange() {
    const emp = this.Empleados().find(e => e.idEmpleado === Number(this.form.idEmpleados));
    if (emp) this.form.nombreEmpleado = `${emp.Nombre} ${emp.Apellidos}`;
  }

  // ── CRUD ──
  openModal(mode: 'manual' | 'edit', registro?: ControlAsistencia) {
    if (mode === 'manual') {
      this.editId = null;
      this.form = {
        HoraEntrada: '',
        HoraSalida: '',
        
        idUsuarios: 1,
        fecha: this.hoyCR() 
      };
    } else if (registro) {
      this.editId = registro.idControlAsistencia;
      this.form = { ...registro };
    }
    this.showFormModal = true;
  }


viewInAnotherPage(r: ControlAsistencia): void {
  localStorage.setItem('displayData', JSON.stringify({
    titulo: 'Detalle de asistencia',
    volver: '/asistencia',
    datos: {
      ID: `#${r.idControlAsistencia}`,
      Empleado: r.nombreEmpleado,
      'ID Empleado': `#${r.idEmpleados}`,
      Fecha: this.fmtFecha(r.fecha),
      'Hora entrada': r.HoraEntrada || '—',
      'Hora salida': r.HoraSalida || '—',
      'Horas trabajadas': this.calcularHoras(r.HoraEntrada, r.HoraSalida),
      Estado: r.estado,
      'Registrado por': r.idUsuarios ? 'Administrador' : 'Empleado',
      Observación: r.observacion || '—'
    }
  }));

  this.router.navigate(['/ver-datos']);
}




  saveRegistro() {
    if (!this.form.idEmpleados) {
      alert('Por favor selecciona un empleado.');
      return;
    }
    if (this.editId) {
      this.actualizarRegistro({ ...this.form, idControlAsistencia: this.editId });
    } else {
      this.crearRegistro(this.form);
    }
    this.showFormModal = false;
  }

  marcarEntrada() {
    this.marcaEmpleadoId = '';
    this.showMarcaModal = true;
  }

  registrarMarca(tipo: 'entrada' | 'salida') {
    if (!this.marcaEmpleadoId) {
      alert('Selecciona un empleado.');
      return;
    }

    const ahora = this.ahoraCR(); 
    const hoy   = this.hoyCR();   

    const registroHoy = this.Registros().find(r =>
      r.idEmpleados === Number(this.marcaEmpleadoId) &&
      r.fecha === hoy
    );

    // ───── ENTRADA ─────
    if (tipo === 'entrada') {
      if (registroHoy) {
        alert('Este empleado ya marcó entrada hoy');
        return;
      }

      this.crearRegistro({
        idEmpleados: Number(this.marcaEmpleadoId),
        HoraEntrada: ahora,
        HoraSalida: undefined,  
        fecha: hoy,
       
        idUsuarios: 1           
      });
    }

    // ───── SALIDA ─────
    if (tipo === 'salida') {
      if (!registroHoy) {
        alert('Primero debe marcar entrada');
        return;
      }

      if (registroHoy.HoraSalida) {
        alert('La salida ya fue registrada');
        return;
      }

      this.actualizarRegistro({
        ...registroHoy,                           // ✅ spread completo, no se pierde ningún campo
        HoraSalida: ahora,
        idUsuarios: registroHoy.idUsuarios ?? 1,  // ✅ nunca undefined
        fecha: hoy
      });
    }

    this.showMarcaModal = false;
  }

  askDelete(id: number) {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.deleteTargetId !== null) {
      this.eliminarRegistro(this.deleteTargetId);
    }
    this.deleteTargetId = null;
    this.showDeleteModal = false;
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'marca' | 'delete') {
    if (event.target === event.currentTarget) {
      if (modal === 'form')   this.showFormModal   = false;
      if (modal === 'marca')  this.showMarcaModal  = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}