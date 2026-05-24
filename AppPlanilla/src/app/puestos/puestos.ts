import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
interface Puesto {
  idPuestos: number;
  NombrePuesto: string;
  Descripcion: string;
  SalarioBase: number;
  Estado: string | number;
  idEmpleado?: number;
  idUsuario?: number;
}

interface Empleado {
  idEmpleado: number;
  Nombre: string;
  Apellidos: string;
}

interface Usuario {
  idUsuario: number;
  Nombre: string;
  Apellidos: string;
  Estado: number;
}

@Component({
  selector: 'app-puestos',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './puestos.html',
  styleUrl: './puestos.css',
})
export class Puestos implements OnInit {

  private readonly http = inject(HttpClient);
private readonly router = inject(Router);

  private readonly API_URL      = 'https://backenplanilla-production.up.railway.app/';
  private readonly PUESTO_URL   = `${this.API_URL}/PuestosServicio/`;
  private readonly EMPLEADO_URL = `${this.API_URL}/EmpleadoServicio/`;
  private readonly USUARIO_URL  = `${this.API_URL}/UsuarioServicio/`;

  protected readonly Empleados = signal<Empleado[]>([]);
  protected readonly Puesto    = signal<Puesto[]>([]);
  protected readonly Usuarios  = signal<Usuario[]>([]);

  readonly COLORS = ['av-red', 'av-green', 'av-blue', 'av-amber', 'av-violet', 'av-teal'];
  readonly perPage = 8;

  showFormModal   = false;
  showViewModal   = false;
  showDeleteModal = false;

  searchQuery  = '';
  estadoFiltro = '';
  currentPage  = 1;

  editId: number | null = null;
  form: Partial<Puesto> = {};
  viewedPuesto!: Puesto;
  deleteTargetId: number | null = null;

  ngOnInit(): void {
    this.getEmpleados();
    this.getUsuarios();
    this.getPuesto();
  }

  // ── HTTP GET ──
  getEmpleados(): void {
    this.http.get<Empleado[]>(`${this.EMPLEADO_URL}listarEmpleados`).subscribe({
      next: (data) => this.Empleados.set(data),
      error: (err) => console.error('Error al obtener empleados:', err)
    });
  }

  getUsuarios(): void {
    this.http.get<Usuario[]>(`${this.USUARIO_URL}listarUsuarios`).subscribe({
      next: (data) => this.Usuarios.set(data),
      error: (err) => console.error('Error al obtener usuarios:', err)
    });
  }

  getPuesto(): void {
    this.http.get<Puesto[]>(`${this.PUESTO_URL}listarPuestos`).subscribe({
      next: (data) => this.Puesto.set(data),
      error: (err) => console.error('Error al obtener puestos:', err)
    });
  }

  // ── HTTP POST ──
 crearPuesto(puesto: Partial<Puesto>): void {
  const body = {
    ...puesto,
    Estado: puesto.Estado === 'Activo' || puesto.Estado == 1 ? 1 : 0
  };
  this.http.post(`${this.PUESTO_URL}insertar`, body).subscribe({
    next: () => this.getPuesto(),
    error: (err) => console.error('Error al crear puesto:', err)
  });
}


  
 // ── HTTP PUT ──
actualizarPuesto(id: number, puesto: Partial<Puesto>): void {
  const body = {
    ...puesto,
    IdPuestos: id,  // ✅ el backend espera IdPuestos en el body (con I mayúscula)
    Estado: puesto.Estado === 'Activo' || puesto.Estado == 1 ? 1 : 0
  };
  this.http.put(`${this.PUESTO_URL}actualizar`, body).subscribe({ // ✅ sin /:id
    next: () => this.getPuesto(),
    error: (err) => console.error('Error al actualizar puesto:', err)
  });
}

// ── HTTP DELETE ──
eliminarPuesto(id: number): void {
  this.http.delete(`${this.PUESTO_URL}eliminar`, { params: { id } }).subscribe({ // ✅ ?id= como query param
    next: () => this.getPuesto(),
    error: (err) => console.error('Error al eliminar puesto:', err)
  });
}

  // ── Helpers ──
  min(a: number, b: number) { return Math.min(a, b); }

  colorFor(id: number) { return this.COLORS[(id - 1) % this.COLORS.length]; }

  fmtSalary(n: number) { return '₡' + Number(n).toLocaleString('es-CR'); }

  estadoLabel(s: string | number): string {
    if (s == 1) return 'Activo';
    if (s == 0) return 'Inactivo';
    return String(s);
  }

  estadoClass(s: string | number): string {
    return this.estadoLabel(s) === 'Activo' ? 'status-active' : 'status-inactive';
  }

  countByEstado(e: string) {
    return this.Puesto().filter(p => this.estadoLabel(p.Estado) === e).length;
  }

  getSalarioPromedio() {
    const list = this.Puesto();
    if (!list.length) return '₡0';
    const avg = list.reduce((s, p) => s + p.SalarioBase, 0) / list.length;
    return this.fmtSalary(Math.round(avg));
  }

  getSalarioMaximo() {
    const list = this.Puesto();
    if (!list.length) return '₡0';
    return this.fmtSalary(Math.max(...list.map(p => p.SalarioBase)));
  }

  getNombreEmpleado(id: number) {
    const e = this.Empleados().find(e => e.idEmpleado === id);
    return e ? `${e.Nombre} ${e.Apellidos}` : '—';
  }

  getNombreUsuario(id: number) {
    const u = this.Usuarios().find(u => u.idUsuario === id);
    return u ? `${u.Nombre} ${u.Apellidos}` : '—';
  }

  // ── Computed ──
  get filteredPuestos(): Puesto[] {
    const q = this.searchQuery.toLowerCase();
    return this.Puesto().filter(p =>
      (!q || p.NombrePuesto.toLowerCase().includes(q) || p.Descripcion?.toLowerCase().includes(q)) &&
      (!this.estadoFiltro || this.estadoLabel(p.Estado) === this.estadoFiltro)
    );
  }

  get pageSlice(): Puesto[] {
    const start = (this.currentPage - 1) * this.perPage;
    return this.filteredPuestos.slice(start, start + this.perPage);
  }

  get totalPages(): number[] {
    const count = Math.ceil(this.filteredPuestos.length / this.perPage) || 1;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  // ── Filtro / paginación ──
  filterTable() { this.currentPage = 1; }
  changePage(d: number) {
    const max = this.totalPages.length;
    this.currentPage = Math.max(1, Math.min(max, this.currentPage + d));
  }
  goPage(n: number) { this.currentPage = n; }

  // ── CRUD ──
  openModal(mode: 'create' | 'edit', id?: number) {
    if (mode === 'create') {
      this.editId = null;
      this.form = { Estado: 'Activo', idEmpleado: undefined, idUsuario: undefined };
    } else {
      const p = this.Puesto().find(x => x.idPuestos === id)!;
      this.editId = p.idPuestos;
      this.form = { ...p };
    }
    this.showViewModal = false;
    this.showFormModal = true;
  }

  savePuesto() {
    if (!this.form.NombrePuesto?.trim()) {
      alert('Por favor ingresa el nombre del puesto.');
      return;
    }
    if (this.editId) {
      this.actualizarPuesto(this.editId, this.form); 
    } else {
      this.crearPuesto(this.form); 
    }
    this.showFormModal = false;
  }

  viewPuesto(id: number) {
    this.viewedPuesto = this.Puesto().find(p => p.idPuestos === id)!;
    this.showViewModal = true;
  }

  viewInAnotherPage(p: Puesto): void {
  localStorage.setItem('displayData', JSON.stringify({
    titulo: 'Detalle del puesto',
    volver: '/puestos',
    datos: {
      ID: `#${p.idPuestos}`,
      Puesto: p.NombrePuesto,
      Descripción: p.Descripcion || '—',
      'Salario base': this.fmtSalary(p.SalarioBase),
      Estado: this.estadoLabel(p.Estado),
      'Empleado asignado': p.idEmpleado ? this.getNombreEmpleado(p.idEmpleado) : 'Sin asignar',
      'ID Empleado': p.idEmpleado ? `#${p.idEmpleado}` : 'No aplica',
      'Usuario responsable': p.idUsuario ? this.getNombreUsuario(p.idUsuario) : '—',
      'ID Usuario': p.idUsuario ? `#${p.idUsuario}` : 'No aplica'
    }
  }));

  this.router.navigate(['/ver-datos']);
}

  editFromView() {
    this.showViewModal = false;
    this.openModal('edit', this.viewedPuesto.idPuestos);
  }

  askDelete(id: number) {
    this.deleteTargetId = id;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.deleteTargetId !== null) {
      this.eliminarPuesto(this.deleteTargetId); // ✅ llama al backend
    }
    this.deleteTargetId = null;
    this.showDeleteModal = false;
  }

  onOverlayClick(event: MouseEvent, modal: 'form' | 'view' | 'delete') {
    if (event.target === event.currentTarget) {
      if (modal === 'form')   this.showFormModal   = false;
      if (modal === 'view')   this.showViewModal   = false;
      if (modal === 'delete') this.showDeleteModal = false;
    }
  }
}