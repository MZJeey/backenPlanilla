const { supabase } = require("../supabase.js");

class Servicio1 {
  constructor() {}

  async listar(Datos) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("User", Datos.Usuario);

    if (error) throw error;
    return data;
  }

  async listar2() {
    const { data, error } = await supabase.from("empleados").select("*");

    if (error) throw error;
    return data;
  }
}

module.exports = new Servicio1();
