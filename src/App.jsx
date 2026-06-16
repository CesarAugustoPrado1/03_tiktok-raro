import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);

  // Estado para controlar el progreso de la barra (de 0 a 100)
  const [progreso, setProgreso] = useState(0);

  // Perfil de interés del usuario (puntuación por categoría)
  const [intereses, setIntereses] = useState({
    futbol: 0,
    noticias: 0,
    cocina: 0,
    tecnologia: 0
  });

  const videoRef = useRef(null);
  const tiempoRef = useRef(null);

  // 1. Cargar videos de Supabase
  useEffect(() => {
    async function obtenerVideos() {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setListaVideos(data);
        } else {
          throw new Error("No se encontraron filas en la tabla 'videos'.");
        }
      } catch (err) {
        console.error(err);
        setErrorApp(err.message);
      } finally {
        setCargando(false);
      }
    }
    obtenerVideos();
  }, []);

  // 2. Manejar el temporizador y la barra de progreso de forma fluida
  useEffect(() => {
    if (cargando || listaVideos.length === 0) return;

    // Reseteamos la barra cada vez que cambia el video
    setProgreso(0);

    // Creamos un intervalo que sume progreso cada 100ms (duración total: ~6 segundos)
    tiempoRef.current = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 100) {
          clearInterval(tiempoRef.current);
          alTerminarTiempoAutomatico();
          return 100;
        }
        return prev + 1.6; // Velocidad de llenado
      });
    }, 100);

    return () => clearInterval(tiempoRef.current);
  }, [indiceActual, cargando, listaVideos]);

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh' }}>Cargando algoritmo...</div>;

  const videoPrincipal = listaVideos[indiceActual];
  const indexIzquierda = (indiceActual + 1) % listaVideos.length;
  const indexDerecha = (indiceActual + 2) % listaVideos.length;

  const previewIzquierda = listaVideos[indexIzquierda];
  const previewDerecha = listaVideos[indexDerecha];

  // ACCIÓN 1: El usuario elige manualmente (hace clic abajo)
  const elegirManual = (nuevoIndice, categoriaElegida) => {
    clearInterval(tiempoRef.current);
    
    // Sumamos puntos a la categoría que el usuario clickeó
    setIntereses(prev => ({
      ...prev,
      [categoriaElegida]: prev[categoriaElegida] + 10
    }));

    cambiarVideo(nuevoIndice);
  };

  // ACCIÓN 2: El usuario no tocó nada y se llenó la barra (Interés pasivo)
  const alTerminarTiempoAutomatico = () => {
    // Le sumamos puntos al video que se quedó mirando completo
    const catActual = videoPrincipal.categoria;
    setIntereses(prev => ({
      ...prev,
      [catActual]: prev[catActual] + 5
    }));

    // El algoritmo decide: va al de la izquierda por defecto, o al que tenga más puntos
    cambiarVideo(indexIzquierda);
  };

  const cambiarVideo = (nuevoIndice) => {
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
        
        /* LA BARRA DE PROGRESO DEL ALGORITMO */
        .contenedor-linea-tiempo { position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: rgba(255,255,255,0.2); z-index: 20; }
        .linea-progreso { height: 100%; background: #00ffcc; transition: width 0.1s linear; }
        
        /* Consola de depuración para ver los puntos en vivo */
        .consola-algoritmo { position: absolute; top: 95px; left: 20px; right: 20px; background: rgba(0,0,0,0.75); padding: 8px; border-radius: 6px; color: #fff; font-size: 11px; font-family: monospace; z-index: 15; border: 1px solid #333; text-align: left; }

        .barra-previews { position: absolute; bottom: 40px; left: 0; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; box-sizing: border-box; z-index: 10; }
        .tarjeta-preview { width: 110px; height: 150px; background: #222; border-radius: 12px; overflow: hidden; border: 2px solid rgba(255,255,255,0.4); cursor: pointer; position: relative; box-shadow: 0 8px 16px rgba(0,0,0,0.6); transition: transform 0.2s; }
        .tarjeta-preview:hover { transform: scale(1.05); border-color: #00ffcc; }
        .tarjeta-preview img { width: 100%; height: 100%; object-fit: cover; }
        .badge-categoria { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #00ffcc; font-size: 10px; padding: 3px 6px; border-radius: 4px; text-transform: uppercase; font-weight: bold; }
        .titulo-video { position: absolute; top: 25px; left: 20px; right: 20px; color: #fff; background: rgba(0,0,0,0.6); padding: 12px; border-radius: 8px; font-size: 14px; text-align: center; z-index: 10; backdrop-filter: blur(4px); }
      `}</style>

      {/* Barra de progreso de arriba */}
      <div className="contenedor-linea-tiempo">
        <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
      </div>

      {/* Título */}
      <div className="titulo-video">
        <strong>[{videoPrincipal.categoria.toUpperCase()}]</strong> {videoPrincipal.titulo}
      </div>

      {/* Video */}
      <video 
        ref={videoRef}
        className="reproductor-principal"
        src={videoPrincipal.url_video}
        autoPlay
        muted
        playsInline
        controls
        preload="metadata"
      />

      {/* Las dos Previews */}
      <div className="barra-previews">
        <div className="tarjeta-preview" onClick={() => elegirManual(indexIzquierda, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <img src={previewIzquierda.url_preview} alt="Preview Izq" />
        </div>

        <div className="tarjeta-preview" onClick={() => elegirManual(indexDerecha, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <img src={previewDerecha.url_preview} alt="Preview Der" />
        </div>
      </div>
    </div>
  );
}

export default App;