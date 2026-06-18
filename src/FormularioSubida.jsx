// src/FormularioSubida.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { arbolCategorias } from './categorias';

export default function FormularioSubida({ archivo, alCerrar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  // Agarra la primera categoría de las 15 como inicial por defecto
  const categoriasKeys = Object.keys(arbolCategorias);
  const [categoria, setCategoria] = useState(categoriasKeys[0]);
  const [subCategoria, setSubCategoria] = useState('');

  // Sincronizar subcategorías cada vez que cambie la categoría principal
  useEffect(() => {
    if (arbolCategorias[categoria]) {
      setSubCategoria(arbolCategorias[categoria].subcategories[0].id);
    }
  }, [categoria]);

  const procesarSubidaFinal = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return alert("Por favor, ponele un título al video");

    try {
      setSubiendo(true);

      // 1. Obtener la sesión activa para rescatar el id del usuario logueado
      const { data: { session } } = await supabase.auth.getSession();
      const usuarioActual = session?.user;

      if (!usuarioActual) {
        alert("Tenés que estar logueado para subir videos.");
        setSubiendo(false);
        return;
      }

      // 2. Subir el archivo multimedia al Storage de Supabase
      const nombreArchivo = `${Date.now()}_${archivo.name || 'video.mp4'}`;
      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(nombreArchivo, archivo);

      if (storageError) throw storageError;

      // 3. Obtener la URL pública del recurso almacenado
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(nombreArchivo);

      // 4. Insertar el registro en la tabla vinculando la nueva columna 'user_id'
      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            titulo: titulo,
            descripcion: descripcion,
            categoria: categoria,
            sub_categoria: subCategoria,
            url_video: urlData.publicUrl,
            url_preview: 'automatico',
            user_id: usuarioActual.id // <-- ¡LÍNEA NUEVA CRÍTICA! Vincula el video con su dueño
          }
        ]);

      if (dbError) throw dbError;

      alert("¡Video subido con éxito, César!");
      alCerrar(true); // Cierra y avisa que debe refrescar la lista general
    } catch (error) {
      alert("Error al subir al servidor: " + error.message);
      setSubiendo(false);
    }
  };

  return (
    <div className="modal-emergente">
      <div className="tarjeta-modal">
        <h3>Detalles del Video 📹</h3>
        <form onSubmit={procesarSubidaFinal}>
          
          <div className="campo-formulario">
            <label>Título del video</label>
            <input 
              type="text" 
              placeholder="Ej: Tremendo golazo en el barrio" 
              value={titulo} 
              onChange={(e) => setTitulo(e.target.value)}
              disabled={subiendo}
            />
          </div>

          <div className="campo-formulario">
            <label>Descripción</label>
            <textarea 
              rows="2" 
              placeholder="Contá un poco de qué se trata..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={subiendo}
            />
          </div>

          <div className="campo-formulario">
            <label>Categoría Principal</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              disabled={subiendo}
            >
              {categoriasKeys.map((key) => (
                <option key={key} value={key}>
                  {arbolCategorias[key].nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo-formulario">
            <label>Tipo Específico (Subcategoría)</label>
            <select 
              value={subCategoria} 
              onChange={(e) => setSubCategoria(e.target.value)}
              disabled={subiendo}
            >
              {arbolCategorias[categoria]?.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="boton-subir" disabled={subiendo}>
            {subiendo ? "Subiendo todo... 🔄" : "Subir Video 🚀"}
          </button>

          {!subiendo && (
            <button type="button" className="boton-cancelar" onClick={() => alCerrar(false)}>
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}