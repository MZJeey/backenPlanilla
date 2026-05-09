const { supabase } = require("../SupaBase");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class UsuarioServicio {
  constructor() {}
  PalabraSecreta = "MiPalabraSecreta";

  async Autenticacion(correo, ClaveSinEncriptar) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("correo", correo)
      .single();

    if (error || !data) return false;

    const Usuario = data;

    let Resultado = false;
    try {
      Resultado = await bcrypt.compare(ClaveSinEncriptar, Usuario.Clave);
    } catch (err) {
      return false;
    }

    if (Resultado === true) {
      return await this.GenerarToken(Usuario.Nombre, Usuario.correo);
    } else {
      return false;
    }
  }

  async GenerarToken(Nombre, Correo) {
    let token = jwt.sign({ Nombre, Correo }, this.PalabraSecreta, {
      expiresIn: "10m",
    });
    await supabase
      .from("usuarios")
      .update({ Token: token })
      .eq("correo", Correo);
    return token;
  }

  async ValidarToken(authorizationHeader) {
    return true;
  }

  async DesAutenticacion(CorreoElectronico) {
    const { error } = await supabase
      .from("usuarios")
      .update({ Token: null })
      .eq("correo", CorreoElectronico);
    if (error) throw error;
    return true;
  }

  // Listar todos los usuarios
  async listarUsuarios() {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    return data;
  }

  async listarUsuariosCombo() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("idUsuario,Nombre,Apellidos")
      .eq("Estado", 1);
    if (error) throw error;
    return data.map((u) => ({
      idUsuario: u.idUsuario,
      NombreCompleto: `${u.Nombre} ${u.Apellidos}`,
    }));
  }

  // Obtener usuario por ID
  async obtenerPorId(id) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("idUsuario", id)
      .single();

    if (error) throw error;
    return data;
  }

  // Insertar usuario
  async insertar(datos) {
    const claveHash = await bcrypt.hash(datos.Clave, 10);

    const { data, error } = await supabase
      .from("usuarios")
      .insert({
        Nombre: datos.Nombre,
        Apellidos: datos.Apellidos,
        Estado: datos.Estado,
        FechaCreacion: datos.FechaCreacion,
        Clave: claveHash,
        telefono: datos.telefono,
        correo: datos.correo,
        IdRol: datos.idRol,
        IdDepartamento: datos.idDepartamento,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Actualizar usuario
  async actualizar(datos) {
    const claveHash = await bcrypt.hash(datos.Clave, 10);

    const { data, error } = await supabase
      .from("usuarios")
      .update({
        Nombre: datos.Nombre,
        Apellidos: datos.Apellidos,
        Clave: claveHash,
        correo: datos.correo,
        telefono: datos.telefono,
        FechaCreacion: datos.FechaCreacion,
        Estado: datos.Estado,
        IdRol: datos.idRol,
        IdDepartamento: datos.idDepartamento,
      })
      .eq("idUsuario", datos.idUsuario)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Eliminar usuario (con cascade lógico manejado)
  async eliminar(id) {
    // Borrar referencias en cascade (simulado - supabase puede manejar FK real si existen)
    const tables = [
      "detalleplanilla",
      "pagos",
      "deducciones",
      "aguinaldos",
      "contratos",
      "controlasistencia",
      "controlhorarios",
      "historialsalarios",
      "licencias",
      "puestos",
      "vacaciones",
      "planillas",
    ];

    for (const table of tables) {
      const userColMap = {
        detalleplanilla: "idPlanilla",
        pagos: ["IdUsuarioProcesa", "idDeduccion"],
        deducciones: "usuariosId",
        aguinaldos: "idUsuario",
        contratos: "usuarioId",
        controlasistencia: "idUsuarios",
        controlhorarios: "idUsuarios",
        historialsalarios: "idUsuarios",
        licencias: "idUsuario",
        puestos: "idUsuario",
        vacaciones: "UsuarioAprueba",
        planillas: "IdUsuario",
      };

      const cols = userColMap[table];
      if (!cols) continue;

      if (Array.isArray(cols)) {
        // Para pagos: borrar por IdUsuarioProcesa y por deducciones del usuario
        if (cols.includes("IdUsuarioProcesa")) {
          await supabase.from("pagos").delete().eq("IdUsuarioProcesa", id);
        }
        if (cols.includes("idDeduccion")) {
          const { data: deds } = await supabase
            .from("deducciones")
            .select("idDeducciones")
            .eq("usuariosId", id);
          if (deds && deds.length) {
            const dedIds = deds.map((d) => d.idDeducciones);
            await supabase.from("pagos").delete().in("idDeduccion", dedIds);
          }
        }
      } else if (table === "detalleplanilla") {
        // detalleplanilla -> planillas -> usuario
        const { data: plans } = await supabase
          .from("planillas")
          .select("idPlanillas")
          .eq("IdUsuario", id);
        if (plans && plans.length) {
          const planIds = plans.map((p) => p.idPlanillas);
          await supabase
            .from("detalleplanilla")
            .delete()
            .in("idPlanilla", planIds);
        }
      } else {
        await supabase.from(table).delete().eq(cols, id);
      }
    }

    // Finalmente borrar el usuario
    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("idUsuario", id);
    if (error) throw error;
    return { mensaje: "Usuario eliminado correctamente" };
  }
}

module.exports = new UsuarioServicio();
