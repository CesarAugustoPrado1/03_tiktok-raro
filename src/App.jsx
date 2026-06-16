import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  // Estados para el Modal de Datos del nuevo video
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('futbol');
  const [nuevaSubCategoria, setNuevaSubCategoria] = useState('goles'); // Subcategoría inicial

  // Definición del árbol de subcategorías dinámicas
  const arbolSubCategorias = {
    futbol: [
      { id: 'goles', nombre: '⚽ Goles / Jugadas' },
      { id: 'messi', nombre: '👑 Messi / Eléctrico' },
      { id: 'potrero', nombre: '👟 Fútbol de Barrio' },
      { id: 'otros-deportes', nombre: '🏀 Otros Deportes' }
    ],
    cocina: [
      { id: 'dulce', nombre: '🍰 Postres y Dulces' },
      { id: 'salado', nombre: '🍕 Comidas e Ideas' },
      { id: 'bajon', nombre: '🍔 Recetas Bajoneras' },
      { id: 'express', nombre: '⏱️ Cocina en 1 Minuto' }
    ],
    tecnologia: [
      { id: 'gadgets', nombre: '📱 Celulares y Unboxings' },
      { id: 'ia', nombre: '🤖 Inteligencia Artificial' },
      { id: 'setups', nombre: '💻 Computadoras / Setups' },
      { id: 'trucos', nombre: '💡 Trucos Tecnológicos' }
    ],
    noticias: [
      { id: 'urgente', nombre: '🚨 Último Momento' },
      { id: 'curiosidades', nombre: '🌍 Datos Curiosos' },
      { id: 'memes-info', nombre: '🤡 Noticias Raras / Memes' },
      { id: 'streaming', nombre: '🎙️ Clips de Streams' }
    ]
  };

  // Cada vez que cambie la categoría principal, reseteamos la subcategoría a la primera de la lista
  useEffect(() => {
    if (arbolSubCategorias[nuevaCategoria]) {
      setNuevaSubCategoria(arbolSubCategorias[nuevaCategoria][0].id);
    }
  }, [nuevaCategoria]);

  // El cerebro: El algoritmo arranca con una base neutra
  const [intereses, setIntereses] = useState({
    futbol: 5,
    noticias: 5,
    cocina: 5,
    tecnologia: 5
  });

  const videoRef = useRef(null);
  const tiempoEntradaRef = useRef(Date.now());

  // 1. Cargar videos desde Supabase
  useEffect(() => {
    async function obtenerVideos() {
      try {
        let { data, error } = await supabase.from('videos').select('*');

        if (error) throw new Error(`Error de Supabase: ${error.message}`);

        if (!data || data.length === 0) {
          const { data: nuevaFila, error: errorInsert } = await supabase
            .from('videos')
            .insert([
              {
                titulo: 'Video Inicial de Fútbol',
                url_video: 'https://www.w3schools.com/html/mov_bbb.mp4',
                categoria: 'futbol',
                sub_categoria: 'goles',
                url_preview: 'automatico'
              }
            ])
            .select();

          if (errorInsert) throw errorInsert;
          data = nuevaFila;
        }

        if (data && data.length > 0) {
          setListaVideos(data);
          setErrorApp(null);
        }
      } catch (err) {
        console.error("Error en la carga:", err);
        setErrorApp(err.message);
      } finally {
        setCargando(false);
      }
    }
    obtenerVideos();
  }, []);

  // 2. Controlar la barra de progreso (Últimos 6 segundos)
  const controlarProgresoVideo = () => {
    if (mostrarModal) return;
    const video = videoRef.current;
    if (!video || isNaN(video.duration)) return;

    const tiempoRestante = video.duration - video.currentTime;

    if (tiempoRestante <= 6) {
      const tiempoTranscurridoEnSeisSeg = 6 - tiempoRestante;
      const porcentaje = (tiempoTranscurridoEnSeisSeg / 6) * 100;
      setProgreso(porcentaje);
    } else {
      setProgreso(0);
    }
  };

  // 3. Cuando el video termina
  const alTerminarVideoCompleto = () => {
    const videoPrincipal = listaVideos[indiceActual];
    if (!videoPrincipal) return;

    setIntereses(prev => ({
      ...prev,
      [videoPrincipal.categoria]: (prev[videoPrincipal.categoria] || 0) + 5
    }));
    
    const { indexIzquierda } = calcularPreviewsInteligentes();
    cambiarVideo(indexIzquierda);
  };

  // 4. Sistema de Previews inteligentes
  const calcularPreviewsInteligentes = () => {
    if (listaVideos.length === 0) return { indexIzquierda: 0, indexDerecha: 0 };
    if (listaVideos.length === 1) return { indexIzquierda: 0, indexDerecha: 0 };

    let categoriaFavorita = 'futbol';
    let maxPuntos = -999;
    Object.keys(intereses).forEach(cat => {
      if (intereses[cat] > maxPuntos) {
        maxPuntos = intereses[cat];
        categoriaFavorita = cat;
      }
    });

    let opcionesIzquierda = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indiceActual && v.categoria === categoriaFavorita);

    if (opcionesIzquierda.length === 0) {
      opcionesIzquierda = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indiceActual);
    }
    const indexIzquierda = opcionesIzquierda[0].originalIndex;

    let opcionesDerecha = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indiceActual && v.originalIndex !== indexIzquierda);

    if (opcionesDerecha.length === 0) {
      opcionesDerecha = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indiceActual);
    }
    
    const opcionesVariadas = opcionesDerecha.filter(v => v.categoria !== categoriaFavorita);
    const indexDerecha = opcionesVariadas.length > 0 ? opcionesVariadas[0].originalIndex : opcionesDerecha[0].originalIndex;

    return { indexIzquierda, indexDerecha };
  };

  const elegirManual = (nuevoIndice, categoriaElegida) => {
    setIntereses(prev => ({ ...prev, [categoriaElegida]: (prev[categoriaElegida] || 0) + 10 }));
    cambiarVideo(nuevoIndice);
  };

  const cambiarVideo = (nuevoIndice) => {
    const tiempoPermanencia = (Date.now() - tiempoEntradaRef.current) / 1000;
    const videoAnterior = listaVideos[indiceActual];
    
    if (tiempoPermanencia < 3 && videoAnterior) {
      setIntereses(prev => ({
        ...prev,
        [videoAnterior.categoria]: Math.max(0, (prev[videoAnterior.categoria] || 0) - 3)
      }));
    }

    setProgreso(0);
    tiempoEntradaRef.current = Date.now();
    setIndiceActual(nuevoIndice);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = listaVideos[nuevoIndice].url_video;
      videoRef.current.load();
    }
  };

  const prepararArchivo = (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (videoRef.current) videoRef.current.pause();
    
    setArchivoSeleccionado(event.target.files[0]);
    setMostrarModal(true);
  };

  const procesarSubidaFinal = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) return;
    if (!nuevoTitulo.trim()) return alert("Por favor, ponele un título al video");

    try {
      setSubiendo(true);

      const nombreArchivo = `${Date.now()}_${archivoSeleccionado.name || 'video.mp4'}`;
      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(nombreArchivo, archivoSeleccionado);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(nombreArchivo);

      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            titulo: nuevoTitulo,
            descripcion: nuevaDescripcion,
            categoria: nuevaCategoria,
            sub_categoria: nuevaSubCategoria, // Mandamos la subcategoría posta elegida en el menú dinámico
            url_video: urlData.publicUrl,
            url_preview: 'automatico'
          }
        ]);

      if (dbError) throw dbError;

      alert("¡Video subido con éxito, César!");
      setMostrarModal(false);
      window.location.reload();
    } catch (error) {
      alert("Error al subir: " + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando || listaVideos.length === 0) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh' }}>Cargando algoritmo inteligente...</div>;

  const videoPrincipal = listaVideos[indiceActual];
  const { indexIzquierda, indexDerecha } = calcularPreviewsInteligentes();
  const previewIzquierda = listaVideos[indexIzquierda];
  const previewDerecha = listaVideos[indexDerecha];

  return (
    <div className="contenedor-tiktok">
      <style>{`
        body, html { margin: 0; padding: 0; background-color: #000; font-family: sans-serif; height: 100vh; overflow: hidden; }
        .contenedor-tiktok { max-width: 450px; margin: 0 auto; height: 100vh; position: relative; background: #000; display: flex; flex-direction: column; justify-content: center; border-left: 1px solid #222; border-right: 1px solid #222; }
        .reproductor-principal { width: 100%; height: 100vh; object-fit: cover; background-color: #111; display: block; }
        .contenedor-linea-tiempo { position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: rgba(255,255,255,0.2); z-index: 20; }
        .linea-progreso { height: 100%; background: #00ffcc; transition: width 0.1s linear; }
        
        .barra-previews { position: absolute; bottom: 40px; left: 0; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; box-sizing: border-box; z-index: 10; }
        .tarjeta-preview { width: 110px; height: 150px; background: #111; border-radius: 12px; overflow: hidden; border: 2px solid rgba(255,255,255,0.4); cursor: pointer; position: relative; box-shadow: 0 8px 16px rgba(0,0,0,0.6); }
        .video-thumbnail { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.85); background: #000; }
        .badge-categoria { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #00ffcc; font-size: 10px; padding: 3px 6px; border-radius: 4px; text-transform: uppercase; font-weight: bold; z-index: 5; }

        .modal-emergente { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); padding: 20px; box-sizing: border-box; }
        .tarjeta-modal { background: #111; border: 1px solid #333; width: 100%; max-width: 360px; border-radius: 16px; padding: 24px; box-sizing: border-box; color: #fff; }
        .tarjeta-modal h3 { margin: 0 0 16px 0; font-size: 18px; color: #00ffcc; text-align: center; }
        .campo-formulario { margin-bottom: 14px; display: flex; flex-direction: column; }
        .campo-formulario label { font-size: 12px; color: #aaa; margin-bottom: 6px; text-transform: uppercase; font-weight: bold; }
        .campo-formulario input, .campo-formulario textarea, .campo-formulario select { background: #222; border: 1px solid #444; border-radius: 8px; padding: 10px; color: #fff; font-size: 14px; outline: none; }
        .campo-formulario input:focus, .campo-formulario textarea:focus, .campo-formulario select:focus { border-color: #00ffcc; }
        .boton-subir { width: 100%; background: #00ffcc; color: #000; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; margin-top: 10px; box-shadow: 0 4px 12px rgba(0,255,210,0.3); }
        .boton-subir:disabled { background: #444; color: #888; box-shadow: none; cursor: not-allowed; }
        .boton-cancelar { width: 100%; background: transparent; color: #aaa; border: none; padding: 8px; font-size: 13px; cursor: pointer; margin-top: 8px; text-decoration: underline; }
      `}</style>

      {/* Línea de tiempo */}
      <div className="contenedor-linea-tiempo">
        <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
      </div>

      {/* MODAL EMERGENTE COMPLETO (Con árbol dinámico) */}
      {mostrarModal && (
        <div className="modal-emergente">
          <div className="tarjeta-modal">
            <h3>Detalles del Video 📹</h3>
            <form onSubmit={procesarSubidaFinal}>
              
              <div className="campo-formulario">
                <label>Título del video</label>
                <input 
                  type="text" 
                  placeholder="Ej: Tremendo golazo en el barrio" 
                  value={nuevoTitulo} 
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  disabled={subiendo}
                />
              </div>

              <div className="campo-formulario">
                <label>Descripción</label>
                <textarea 
                  rows="2" 
                  placeholder="Contá un poco de qué se trata..."
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  disabled={subiendo}
                />
              </div>

              <div className="campo-formulario">
                <label>Categoría Principal</label>
                <select 
                  value={nuevaCategoria} 
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  disabled={subiendo}
                >
                  <option value="futbol">⚽ Fútbol / Deportes</option>
                  <option value="cocina">🍳 Cocina / Recetas</option>
                  <option value="tecnologia">📱 Tecnología / Gadgets</option>
                  <option value="noticias">📰 Noticias / Info</option>
                </select>
              </div>

              {/* NUEVO CAMPO: SUB-CATEGORÍA DINÁMICA */}
              <div className="campo-formulario">
                <label>Tipo Específico (Subcategoría)</label>
                <select 
                  value={nuevaSubCategoria} 
                  onChange={(e) => setNuevaSubCategoria(e.target.value)}
                  disabled={subiendo}
                >
                  {arbolSubCategorias[nuevaCategoria]?.map((sub) => (
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
                <button 
                  type="button" 
                  className="boton-cancelar" 
                  onClick={() => {
                    setMostrarModal(false);
                    if (videoRef.current) videoRef.current.play();
                  }}
                >
                  Cancelar
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* REPRODUCTOR PRINCIPAL */}
      <video
        ref={videoRef}
        className="reproductor-principal"
        src={videoPrincipal.url_video}
        autoPlay
        playsInline
        controls
        preload="metadata"
        onTimeUpdate={controlarProgresoVideo}
        onEnded={alTerminarVideoCompleto}
        onClick={() => {
          if (videoRef.current) {
            videoRef.current.muted = false;
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
          }
        }}
      />

      <div className="barra-previews">
        {/* PREVIEW IZQUIERDA */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexIzquierda, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
        </div>

        {/* BOTONERA VERTICAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', zIndex: 15 }}>
          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <button type="button" style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255, 0, 85, 0.4)', border: 'none', pointerEvents: 'none' }}>
              <div style={{ width: '18px', height: '18px', backgroundColor: '#ff0055', borderRadius: '50%' }}></div>
            </button>
            <input type="file" accept="video/*" capture="environment" onChange={prepararArchivo} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>

          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <button type="button" style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', color: '#000000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 12px rgba(255,255,255,0.2)', border: 'none', pointerEvents: 'none' }}>
              📂
            </button>
            <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" onChange={prepararArchivo} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>
        </div>

        {/* PREVIEW DERECHA */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexDerecha, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <video className="video-thumbnail" src={`${previewDerecha.url_video}#t=0.5`} muted playsInline preload="metadata" />
        </div>
      </div>
    </div>
  );
}

export default App;