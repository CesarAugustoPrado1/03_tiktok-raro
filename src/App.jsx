import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);

  // Estado para controlar la carga de nuevos videos a Supabase
  const [subiendo, setSubiendo] = useState(false);

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
  
  // Referencia directa para disparar el selector de archivos multimedia sin intermediarios
  const selectorArchivoRef = useRef(null);

  // 1. Cargar videos de Supabase
  useEffect(() => {
    async function obtenerVideos() {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          console.log("¡Videos cargados con éxito desde Supabase!", data);
          setListaVideos(data);
          setErrorApp(null); // Limpiamos cualquier error viejo
        } else {
          setErrorApp("La tabla 'videos' devolvió 0 filas. Verificá que los datos estén guardados.");
        }
      } catch (err) {
        console.error("Error en la petición:", err);
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

  // Función para manejar la grabación/subida de videos desde el dispositivo
  const manejarSubidaVideo = async (event) => {
    const archivo = event.target.files[0];
    if (!archivo) return;

    try {
      setSubiendo(true);
      alert("¡Video seleccionado con éxito! Subiendo a la nube, esperá un momento...");

      // Generar un nombre único para evitar duplicados en el Storage
      const nombreArchivo = `${Date.now()}_${archivo.name}`;

      // 1. Subir el archivo al bucket 'videos' en Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(nombreArchivo, archivo);

      if (storageError) throw storageError;

      // 2. Obtener la URL pública oficial del video almacenado
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(nombreArchivo);

      const urlPublicaVideo = urlData.publicUrl;

      // 3. Insertar el nuevo registro en tu tabla de la base de datos
      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            titulo: 'Video del Usuario',
            url_video: urlPublicaVideo,
            categoria: 'tecnologia', // Categoría inicial por defecto
            url_preview: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200' // Miniatura genérica temporal
          }
        ]);

      if (dbError) throw dbError;

      alert("¡Golazo! Tu video se subió y registró correctamente. La app se actualizará.");
      window.location.reload();

    } catch (error) {
      console.error("Error completo en la subida:", error);
      alert("Error al procesar el archivo: " + error.message);
    } finally {
      setSubiendo(false);
    }
  };

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

        .barra-previews { position: absolute; bottom: 40px; left: 0; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; box-sizing: border-box; z-index: 10; }
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

      {/* Video con función para activar sonido con un toque */}
      <video
        ref={videoRef}
        className="reproductor-principal"
        src={videoPrincipal.url_video}
        autoPlay
        playsInline
        controls
        preload="metadata"
        onClick={() => {
          if (videoRef.current) {
            videoRef.current.muted = false;
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
        }}
      />

      {/* Las dos Previews con la Cruz Flotante Optimizada en el Medio */}
      <div className="barra-previews">
        {/* Vista previa Izquierda */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexIzquierda, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <img src={previewIzquierda.url_preview} alt="Preview Izq" />
        </div>

        {/* BOTÓN REAL: Dispara el selector nativo sin interferencias visuales */}
        <button
          type="button"
          onClick={() => {
            if (!subiendo && selectorArchivoRef.current) {
              selectorArchivoRef.current.click();
            }
          }}
          style={{
            width: '54px',
            height: '54px',
            backgroundColor: '#ffffff',
            color: '#000000',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255,255,255,0.3)',
            transition: 'transform 0.1s',
            userSelect: 'none',
            zIndex: 15,
            border: 'none'
          }}
        >
          {subiendo ? "🔄" : "＋"}
        </button>

        {/* Input real pero oculto a la vista */}
        <input
          ref={selectorArchivoRef}
          type="file"
          accept="video/*"
          onChange={manejarSubidaVideo}
          style={{ display: 'none' }}
          disabled={subiendo}
        />

        {/* Vista previa Derecha */}
        <div className="tarjeta-preview" onClick={() => elegirManual(indexDerecha, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <img src={previewDerecha.url_preview} alt="Preview Der" />
        </div>
      </div>
    </div>
  );
}

export default App;