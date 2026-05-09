const { supabase } = require("../supabase.js");

class EmpleadoServicio {
  constructor() {}

  // Listar todos los empleados
  async listarEmpleados() {
    const { data, error } = await supabase.from("empleados").select("*");

    if (error) throw error;
    return data;
  }

  // Obtener empleado por ID
  async obtenerPorId(id) {
    const { data, error } = await supabase
      .from("empleados")
      .select("*")
      .eq("id_empleado", id)
      .single();

    if (error) throw error;
    return data;
  }

  // Insertar un empleado
  // NOTA: HoraEntrada y HoraSalida no estaban en el schema original de empleados.
  // Si los agregaste después, asegurate de tener esas columnas en Supabase.
  async insertar(datos) {
    const { data, error } = await supabase
      .from("empleados")
      .insert({
        codigo_empleado: datos.CodigoEmpleado,
        nombre: datos.Nombre,
        apellidos: datos.Apellidos,
        identificacion: datos.Identificacion,
        correo: datos.Correo,
        telefono: datos.Telefono,
        fecha_ingreso: datos.FechaIngreso,
        estado: datos.Estado,
        hora_entrada: datos.HoraEntrada,
        cuenta_bancaria: datos.CuentaBancaria,
        salario: datos.Salario,
        id_departamento: datos.idDepartamento,
        hora_salida: datos.HoraSalida,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Actualizar un empleado
  async actualizar(datos) {
    const { data, error } = await supabase
      .from("empleados")
      .update({
        codigo_empleado: datos.CodigoEmpleado,
        nombre: datos.Nombre,
        apellidos: datos.Apellidos,
        identificacion: datos.Identificacion,
        correo: datos.Correo,
        telefono: datos.Telefono,
        fecha_ingreso: datos.FechaIngreso,
        estado: datos.Estado,
        hora_entrada: datos.HoraEntrada,
        cuenta_bancaria: datos.CuentaBancaria,
        salario: datos.Salario,
        id_departamento: datos.idDepartamento,
        hora_salida: datos.HoraSalida,
      })
      .eq("id_empleado", datos.idEmpleado)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Eliminar un empleado
  async eliminar(id) {
    const { error } = await supabase
      .from("empleados")
      .delete()
      .eq("id_empleado", id);

    if (error) throw error;
    return { mensaje: "Empleado eliminado correctamente" };
  }
}

module.exports = new EmpleadoServicio();
