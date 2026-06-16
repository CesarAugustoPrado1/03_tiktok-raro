import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  // El cerebro: El algoritmo arranca con una base neutra
  const [intereses, setIntereses] = useState({
    futbol: 5,
    noticias: 5,
    cocina: 5,
    tecnologia: 5
  });

  const videoRef = useRef(null);
  const tiempoEntradaRef = useRef(Date.now()); // Para medir si el usuario pasa de largo el video rápido

  // 1. Cargar videos desde Supabase
  useEffect(() => {
    async function obtenerVideos() {
      try {
        let { data, error } = await supabase.from('videos').select('*');

        if (error) {
          throw new Error(`Error de Supabase (Código ${error.code}): ${error.message}`);
        }

        if (!data || data.length === 0) {
          console.log("Tabla vacía detectada. Inyectando video de prueba...");
          const { data: nuevaFila, error: errorInsert } = await supabase
            .from('videos')
            .insert([
              {
                titulo: 'Video Inicial de Fútbol',
                url_video: 'https://www.w3schools.com/html/mov_bbb.mp4',
                categoria: 'futbol',
                url_preview: 'automatico'
              }
            ])
            .select();

          if (errorInsert) {
            throw new Error(`No se pudo crear el video automático: ${errorInsert.message}`);
          }
          data = nuevaFila;
        }

        if (data && data.length > 0) {
          setListaVideos(data);
          setErrorApp(null);
        }
      } catch (err) {
        console.error("Error en la carga:", err);
        setErrorApp(err.message || "Error desconocido de red");
      } finally {
        setCargando(false);
      }
    }
    obtenerVideos();
  }, []);

  // 2. Controlar la barra de progreso (Últimos 6 segundos)
  const controlarProgresoVideo = () => {
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

  // 3. Cuando el video termina de verdad (Retención Completa)
  const alTerminarVideoCompleto = () => {
    const videoPrincipal = listaVideos[indiceActual];
    if (!videoPrincipal) return;

    // +5 puntos por ver el video entero
    setIntereses(prev => ({
      ...prev,
      [videoPrincipal.categoria]: (prev[videoPrincipal.categoria] || 0) + 5
    }));
    
    // Salto automático al video recomendado de la izquierda
    const { indexIzquierda } = calcularPreviewsInteligentes();
    cambiarVideo(indexIzquierda);
  };

  // 4. SISTEMA MATEMÁTICO: Elegir previews para que NO se repitan y sigan tus gustos
  const calcularPreviewsInteligentes = () => {
    if (listaVideos.length === 0) return { indexIzquierda: 0, indexDerecha: 0 };
    if (listaVideos.length === 1) return { indexIzquierda: 0, indexDerecha: 0 };

    // Buscamos cuál es la categoría favorita actual del usuario (la que tiene más puntos)
    let categoriaFavorita = 'futbol';
    let maxPuntos = -999;
    Object.keys(intereses).forEach(cat => {
      if (intereses[cat] > maxPuntos) {
        maxPuntos = intereses[cat];
        categoriaFavorita = cat;
      }
    });

    // 1. Filtrar opciones para el botón Izquierdo (Prioriza tu categoría favorita, excluyendo el video actual)
    let opcionesIzquierda = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indiceActual && v.categoria === categoriaFavorita);

    // Si no hay videos de tu categoría favorita guardados, agarra cualquiera que no sea el actual
    if (opcionesIzquierda.length === 0) {
      opcionesIzquierda = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indiceActual);
    }
    const indexIzquierda = opcionesIzquierda[0].originalIndex;

    // 2. Filtrar opciones para el botón Derecho (Cualquiera que NO sea el actual Y NO sea el de la izquierda)
    let opcionesDerecha = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indiceActual && v.originalIndex !== indexIzquierda);

    // Salvavidas por si hay poquísimos videos en la DB
    if (opcionesDerecha.length === 0) {
      opcionesDerecha = listaVideos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indiceActual);
    }
    
    // Intentamos que el de la derecha sea de una categoría distinta para dar variedad, si se puede
    const opcionesVariadas = opcionesDerecha.filter(v => v.categoria !== categoriaFavorita);
    const indexDerecha = opcionesVariadas.length > 0 ? opcionesVariadas[0].originalIndex : opcionesDerecha[0].originalIndex;

    return { indexIzquierda, indexDerecha };
  };

  const elegirManual = (nuevoIndice, categoriaElegida) => {
    // Si lo elegís a dedo de la preview, le damos premio gordo de +10 puntos
    setIntereses(prev => ({
      ...prev,
      [categoriaElegida]: (prev[categoriaElegida] || 0) + 10
    }));
    cambiarVideo(nuevoIndice);
  };

  const cambiarVideo = (nuevoIndice) => {
    // ANALIZAR SKIP: Si el usuario estuvo menos de 3 segundos en el video anterior, castigamos la categoría
    const tiempoPermanencia = (Date.now() - tiempoEntradaRef.current) / 1000;
    const videoAnterior = listaVideos[indiceActual];
    
    if (tiempoPermanencia < 3 && videoAnterior) {
      setIntereses(prev => ({
        ...prev,
        [videoAnterior.categoria]: Math.max(0, (prev[videoAnterior.categoria] || 0) - 3)
      }));
    }

    // Resetear entorno para el nuevo video
    setProgreso(0);
    tiempoEntradaRef.current = Date.now();
    setIndiceActual(nuevoIndice);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = listaVideos[nuevoIndice].url_video;
      videoRef.current.load();
    }
  };

  const manejarSubidaVideo = async (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const archivo = event.target.files[0];

    try {
      setSubiendo(true);
      alert("¡Video detectado! Subiendo a Supabase...");

      const nombreArchivo = `${Date.now()}_${archivo.name || 'video.mp4'}`;
      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(nombreArchivo, archivo);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(nombreArchivo);

      // Elige una categoría rotativa simple para el testeo rápido
      const categoriasDisponibles = ['futbol', 'cocina', 'tecnologia', 'noticias'];
      const categoriaAleatoria = categoriasDisponibles[Math.floor(Math.random() * categoriasDisponibles.length)];

      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            titulo: 'Video subido por el usuario',
            url_video: urlData.publicUrl,
            categoria: categoriaAleatoria,
            url_preview: 'automatico'
          }
        ]);

      if (dbError) throw dbError;

      alert("¡Subido con éxito!");
      window.location.reload();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando || listaVideos.length === 0) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh' }}>Cargando algoritmo inteligente...</div>;

  const videoPrincipal = listaVideos[indiceActual];
  
  // Calculamos qué previews mostrar dinámicamente sin duplicados
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
      `}</style>

      {/* Línea de tiempo superior */}
      <div className="contenedor-linea-tiempo">
        <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
      </div>

      {/* REPRODUCTOR PRINCIPAL (El cartel feo de arriba ya fue eliminado por completo) */}
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
        
        {/* PREVIEW IZQUIERDA (Video Recomendado por Gustos) */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexIzquierda, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <video 
            className="video-thumbnail"
            src={`${previewIzquierda.url_video}#t=0.5`}
            muted 
            playsInline
            preload="metadata"
          />
        </div>

        {/* BOTONERA VERTICAL EN EL CENTRO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', zIndex: 15 }}>
          
          {/* Grabar en vivo (REC Rojo) */}
          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <button
              type="button"
              style={{
                width: '100%', height: '100%', backgroundColor: '#ffffff',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 0, 85, 0.4)', border: 'none', pointerEvents: 'none'
              }}
            >
              {subiendo ? (
                <span style={{ fontSize: '16px' }}>🔄</span>
              ) : (
                <div style={{ width: '18px', height: '18px', backgroundColor: '#ff0055', borderRadius: '50%' }}></div>
              )}
            </button>
            <input
              type="file"
              accept="video/*"
              capture="environment"
              onChange={manejarSubidaVideo}
              disabled={subiendo}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', borderRadius: '50%'
              }}
            />
          </div>

          {/* Galería (Carpeta) */}
          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <button
              type="button"
              style={{
                width: '100%', height: '100%', backgroundColor: '#ffffff', color: '#000000',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', boxShadow: '0 4px 12px rgba(255,255,255,0.2)', border: 'none', pointerEvents: 'none'
              }}
            >
              {subiendo ? "🔄" : "📂"}
            </button>
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/*"
              onChange={manejarSubidaVideo}
              disabled={subiendo}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', borderRadius: '50%'
              }}
            />
          </div>

        </div>

        {/* PREVIEW DERECHA (Video Alternativo / Exploración) */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexDerecha, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <video 
            className="video-thumbnail"
            src={`${previewDerecha.url_video}#t=0.5`}
            muted 
            playsInline
            preload="metadata"
          />
        </div>

      </div>
    </div>
  );
}

export default App;