import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Empleado {
  idEmpleado?: number;
  CodigoEmpleado: string;
  Nombre: string;
  Apellidos: string;
  Identificacion: string;
  Correo: string;
  Telefono: string;
  FechaIngreso: string;
  Estado: number;
  HoraEntrada: string;
  CuentaBancaria: number;
  Salario: number;
  idDepartamento: number;
  HoraSalida: string;
}

interface Departamento {
  idDepartamento: number;
  Nombre: string;
}

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './empleados.html',
  styleUrl: './empleados.css',
})
export class Empleados implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly API_URL = 'https://backenplanilla-production.up.railway.app/';

  protected readonly Empleados = signal<Empleado[]>([]);
  protected readonly departamentos = signal<Departamento[]>([]);

  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
  readonly perPage = 8;

  showFormModal = false;
  showViewModal = false;
  showDeleteModal = false;

  searchQuery = '';
  statusFilter = '';
  deptFilter = '';

  currentPage = 1;

  editId: number | null = null;
  form: Partial<Empleado> = {};

  viewedEmployee!: Empleado;

  deleteTargetId: number | null = null;
  deleteDesc = '';

  // ── INIT ──
  ngOnInit(): void {
    this.getEmpleados();
    this.getDepartamentos();
  }

  // ── HTTP ──
  getEmpleados(): void {
    this.http.get<any[]>(`${this.API_URL}EmpleadoServicio/listarEmpleados`).subscribe({
      next: (data) => {
        const normalizados = data.map((e: any) => ({
          idEmpleado:     e.idEmpleado     ?? e.id_empleado,
          CodigoEmpleado: e.CodigoEmpleado ?? e.codigo_empleado,
          Nombre:         e.Nombre         ?? e.nombre,
          Apellidos:      e.Apellidos      ?? e.apellidos,
          Identificacion: e.Identificacion ?? e.identificacion,
          Correo:         e.Correo         ?? e.correo,
          Telefono:       e.Telefono       ?? e.telefono,
          FechaIngreso:   e.FechaIngreso   ?? e.fecha_ingreso,
          Estado:         e.Estado         ?? e.estado,
          HoraEntrada:    e.HoraEntrada    ?? e.hora_entrada,
          CuentaBancaria: e.CuentaBancaria ?? e.cuenta_bancaria,
          Salario:        e.Salario        ?? e.salario,
          idDepartamento: e.idDepartamento ?? e.id_departamento,
          HoraSalida:     e.HoraSalida     ?? e.hora_salida,
        }));
        this.Empleados.set(normalizados);
      },
      error: (err) => console.error('Error empleados:', err)
    });
  }

getDepartamentos(): void {
  this.http.get<any>(`${this.API_URL}DepartamentoServicio/listarDepartamentos`).subscribe({
    next: (data) => {
      console.log('RAW departamentos:', data); // ← agrega esto
      let lista: any[] = [];
        if (Array.isArray(data))      lista = data;
        else if (data.data)           lista = data.data;
        else if (data.result)         lista = data.result;

        const normalizados = lista.map((d: any) => ({
          idDepartamento: Number(d.idDepartamento ?? d.id_departamento ?? d.Id ?? d.ID),
          Nombre: d.Nombre ?? d.nombre ?? d.NombreDepartamento ?? 'Sin nombre'
        }));

        this.departamentos.set(normalizados);
      },
      error: (err) => console.error('Error departamentos:', err)
    });
  }

  // ── Helpers ──
  deptName(id: number): string {
    if (!id) return 'Sin departamento';
    const dept = this.departamentos().find(d => Number(d.idDepartamento) === Number(id));
    return dept ? dept.Nombre : 'Sin departamento';
  }

  // ── Computed ──
  get filteredEmployees(): Empleado[] {
    const q = this.searchQuery.toLowerCase();
    return this.Empleados().filter(e => {
      const full = `${e.Nombre} ${e.Apellidos} ${e.Identificacion} ${e.CodigoEmpleado}`.toLowerCase();
      return (
        (!q || full.includes(q)) &&
        (!this.statusFilter || e.Estado === Number(this.statusFilter)) &&
        (!this.deptFilter || e.idDepartamento === Number(this.deptFilter))
      );
    });
  }

  get pageSlice(): Empleado[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredEmployees.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const total = this.totalCount();
    const current = this.currentPage;
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  totalCount(): number {
    return Math.ceil(this.filteredEmployees.length / this.perPage) || 1;
  }

  min(a: number, b: number) { return Math.min(a, b); }

  initials(e: Empleado) {
    return ((e.Nombre?.[0] ?? '?') + (e.Apellidos?.[0] ?? '?')).toUpperCase();
  }

  colorFor(id: number) {
    return this.COLORS[(id - 1) % this.COLORS.length];
  }

  fmtSalary(n: number) {
    return '₡' + Number(n).toLocaleString('es-CR');
  }

  fmtDate(d: string) {
    if (!d) return '—';
    const fecha = String(d).includes('T') ? String(d).split('T')[0] : String(d);
    const [y, m, day] = fecha.split('-');
    return y && m && day ? `${day}/${m}/${y}` : fecha;
  }

  estadoLabel(e: number) { return Number(e) === 1 ? 'Activo' : 'Inactivo'; }
  statusClass(e: number) { return Number(e) === 1 ? 'status-active' : 'status-inactive'; }
  countByStatus(s: number) { return this.Empleados().filter(e => e.Estado === s).length; }

  // ── UI ──
  filterTable() { this.currentPage = 1; }

  changePage(d: number) {
    const max = this.totalCount();
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }

  goPage(n: number) { this.currentPage = n; }

  // ── CRUD ──
  openModal(mode: 'create' | 'edit', id?: number) {
    if (mode === 'create') {
      this.editId = null;
      this.form = {
        CodigoEmpleado: '',
        Nombre: '',
        Apellidos: '',
        Identificacion: '',
        Correo: '',
        Telefono: '',
        FechaIngreso: '',
        Estado: 1,
        HoraEntrada: '',
        CuentaBancaria: 0,
        Salario: 0,
        idDepartamento: 0,
        HoraSalida: ''
      };
    } else {
      const e = this.Empleados().find(x => x.idEmpleado === id)!;
      this.editId = e.idEmpleado!;
      this.form = { ...e };
    }
    this.showFormModal = true;
  }

  saveEmployee() {
    // ── Validaciones ──────────────────────────────────────
    if (!this.form.Nombre?.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    if (!this.form.Apellidos?.trim()) {
      alert('Los apellidos son obligatorios');
      return;
    }
    if (!this.form.CodigoEmpleado?.trim()) {
      alert('El código de empleado es obligatorio');
      return;
    }
    // ── CORRECCIÓN PRINCIPAL: máximo 4 caracteres ─────────
    if (this.form.CodigoEmpleado.length > 4) {
      alert('El código de empleado no puede tener más de 4 caracteres');
      return;
    }
    if (!this.form.idDepartamento || this.form.idDepartamento === 0) {
      alert('Debe seleccionar un departamento');
      return;
    }
    if (!this.form.FechaIngreso) {
      alert('La fecha de ingreso es obligatoria');
      return;
    }
    // ─────────────────────────────────────────────────────

    const payload = {
      ...this.form,
      idEmpleado:     this.editId,
      CodigoEmpleado: this.form.CodigoEmpleado.trim().slice(0, 4), // doble seguro
      Estado:         Number(this.form.Estado),
      Salario:        Number(this.form.Salario),
      CuentaBancaria: Number(this.form.CuentaBancaria),
      idDepartamento: Number(this.form.idDepartamento)
    };

    if (this.editId) {
      this.http.put(`${this.API_URL}EmpleadoServicio/actualizar`, payload).subscribe({
        next: () => { this.getEmpleados(); this.showFormModal = false; },
        error: (err) => {
          console.error('Error al actualizar:', err);
          alert('Error al actualizar el empleado. Revisa los datos e intenta de nuevo.');
        }
      });
    } else {
      this.http.post(`${this.API_URL}EmpleadoServicio/insertar`, payload).subscribe({
        next: () => { this.getEmpleados(); this.showFormModal = false; },
        error: (err) => {
          console.error('Error al insertar:', err);
          alert('Error al guardar el empleado. Revisa los datos e intenta de nuevo.');
        }
      });
    }
  }

  viewInAnotherPage(e: Empleado): void {
    localStorage.setItem('displayData', JSON.stringify({
      titulo: 'Detalle del empleado',
      volver: '/empleados',
      datos: {
        ID: `#${e.idEmpleado}`,
        Nombre: `${e.Nombre} ${e.Apellidos}`,
        Departamento: this.deptName(e.idDepartamento),
        Estado: this.estadoLabel(e.Estado)
      }
    }));
    this.router.navigate(['/ver-datos']);
  }

  askDelete(id: number) {
    const e = this.Empleados().find(x => x.idEmpleado === id)!;
    this.deleteTargetId = id;
    this.deleteDesc = `Eliminar a ${e.Nombre} ${e.Apellidos}`;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    this.http.delete(`${this.API_URL}EmpleadoServicio/eliminar?id=${this.deleteTargetId}`).subscribe({
      next: () => this.getEmpleados(),
      error: (err) => console.error('Error al eliminar:', err)
    });
    this.showDeleteModal = false;
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'view' | 'delete') {
    if (event.target === event.currentTarget) {
      if (modal === 'form')   this.showFormModal = false;
      if (modal === 'view')   this.showViewModal = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}