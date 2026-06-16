import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const [intereses, setIntereses] = useState({
    futbol: 0,
    noticias: 0,
    cocina: 0,
    tecnologia: 0
  });

  const videoRef = useRef(null);

  // 1. Cargar videos con Auto-Inyección de emergencia si está vacía
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
                url_preview: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200'
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

  // 2. Controlar la barra de progreso basándonos en los últimos 6 segundos reales del video
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

  // 3. Cuando el video termina por completo, se gatilla el cambio de algoritmo
  const alTerminarVideoCompleto = () => {
    const videoPrincipal = listaVideos[indiceActual];
    const catActual = videoPrincipal.categoria;
    
    setIntereses(prev => ({ ...prev, [catActual]: prev[catActual] + 5 }));
    
    const indexIzquierda = (indiceActual + 1) % listaVideos.length;
    cambiarVideo(indexIzquierda);
  };

  const manejarSubidaVideo = async (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const archivo = event.target.files[0];

    try {
      setSubiendo(true);
      alert("¡Video detectado! Subiendo a la nube, por favor esperá...");

      const nombreArchivo = `${Date.now()}_${archivo.name || 'video.mp4'}`;

      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(nombreArchivo, archivo);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(nombreArchivo);

      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            titulo: 'Nuevo Video del Usuario',
            url_video: urlData.publicUrl,
            categoria: 'tecnologia',
            url_preview: 'automatico' // Ya no dependemos de esta columna, pero la dejamos para no romper la DB
          }
        ]);

      if (dbError) throw dbError;

      alert("¡Golazo! Tu video se subió correctamente.");
      window.location.reload();

    } catch (error) {
      alert("Error en la subida: " + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando || listaVideos.length === 0) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh' }}>Cargando algoritmo...</div>;

  const videoPrincipal = listaVideos[indiceActual];
  const indexIzquierda = (indiceActual + 1) % listaVideos.length;
  const indexDerecha = (indiceActual + 2) % listaVideos.length;

  const previewIzquierda = listaVideos[indexIzquierda];
  const previewDerecha = listaVideos[indexDerecha];

  const elegirManual = (nuevoIndice, categoriaElegida) => {
    setIntereses(prev => ({ ...prev, [categoriaElegida]: prev[categoriaElegida] + 10 }));
    cambiarVideo(nuevoIndice);
  };

  const cambiarVideo = (nuevoIndice) => {
    setProgreso(0);
    setIndiceActual(nuevoIndice);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = listaVideos[nuevoIndice].url_video;
      videoRef.current.load();
    }
  };

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
        
        /* Estilos clave para que el mini-video actúe como una foto fija hermosa */
        .video-thumbnail { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.85); background: #000; }
        
        .badge-categoria { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #00ffcc; font-size: 10px; padding: 3px 6px; border-radius: 4px; text-transform: uppercase; font-weight: bold; z-index: 5; }
        .titulo-video { position: absolute; top: 25px; left: 20px; right: 20px; color: #fff; background: rgba(0,0,0,0.6); padding: 12px; border-radius: 8px; font-size: 14px; text-align: center; z-index: 10; backdrop-filter: blur(4px); }
      `}</style>

      <div className="contenedor-linea-tiempo">
        <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
      </div>

      <div className="titulo-video">
        <strong>[{videoPrincipal.categoria.toUpperCase()}]</strong> {videoPrincipal.titulo}
      </div>

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
        
        {/* PREVIEW IZQUIERDA CON VIDEO REAL CONGELADO */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexIzquierda, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <video 
            className="video-thumbnail"
            src={previewIzquierda.url_video} 
            muted 
            playsInline
            preload="metadata"
            /* El truco #t=0.5 le avisa al navegador que congele el video en el segundo medio para usarlo de foto */
            src={`${previewIzquierda.url_video}#t=0.5`}
          />
        </div>

        {/* BOTONERA VERTICAL APILADA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', zIndex: 15 }}>
          
          {/* BOTÓN SUPERIOR: CÁMARA (REC Circular) */}
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
                <div style={{ width: '18px', height: '18px', backgroundColor: '#ff0055', borderRadius: '#50%' }}></div>
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

          {/* BOTÓN INFERIOR: GALERÍA (Carpeta) */}
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

        {/* PREVIEW DERECHA CON VIDEO REAL CONGELADO */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexDerecha, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <video 
            className="video-thumbnail"
            src={previewDerecha.url_video} 
            muted 
            playsInline
            preload="metadata"
            src={`${previewDerecha.url_video}#t=0.5`}
          />
        </div>

      </div>
    </div>
  );
}

export default App;