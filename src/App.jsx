// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import FormularioSubida from './FormularioSubida';
import './App.css'; // Importación de los estilos independientes

function App() {
  const [listaVideos, setListaVideos] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorApp, setErrorApp] = useState(null);
  const [progreso, setProgreso] = useState(0);

  // Estados para delegar el control al componente modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  // El cerebro dinámico del algoritmo
  const [intereses, setIntereses] = useState({
    futbol: 5, noticias: 5, cocina: 5, tecnologia: 5,
    autos: 5, fitness: 5, gaming: 5, musica: 5, humor: 5,
    viajes: 5, cine: 5, finanzas: 5, moda: 5, mascotas: 5, educacion: 5
  });

  const videoRef = useRef(null);
  const tiempoEntradaRef = useRef(Date.now());

  // Cargar videos desde la base de datos al iniciar
  useEffect(() => {
    async function obtenerVideos() {
      try {
        let { data, error } = await supabase.from('videos').select('*');
        if (error) throw new Error(`Error de Supabase: ${error.message}`);

        if (data && data.length > 0) {
          setListaVideos(data);
          setErrorApp(null);
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

  const controlarProgresoVideo = () => {
    if (mostrarModal) return;
    const video = videoRef.current;
    if (!video || isNaN(video.duration)) return;

    const tiempoRestante = video.duration - video.currentTime;
    if (tiempoRestante <= 6) {
      setProgreso(((6 - tiempoRestante) / 6) * 100);
    } else {
      setProgreso(0);
    }
  };

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

  const calcularPreviewsInteligentes = () => {
    if (listaVideos.length <= 1) return { indexIzquierda: 0, indexDerecha: 0 };

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

  const manejarCierreModal = (necesitaRecargar) => {
    setMostrarModal(false);
    setArchivoSeleccionado(null);
    if (necesitaRecargar) {
      window.location.reload();
    } else {
      if (videoRef.current) videoRef.current.play();
    }
  };

  if (errorApp) return <div style={{ color: 'red', padding: '20px' }}>Error: {errorApp}</div>;
  if (cargando || listaVideos.length === 0) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '20vh' }}>Cargando algoritmo limpio...</div>;

  const videoPrincipal = listaVideos[indiceActual];
  const { indexIzquierda, indexDerecha } = calcularPreviewsInteligentes();
  const previewIzquierda = listaVideos[indexIzquierda];
  const previewDerecha = listaVideos[indexDerecha];

  return (
    <div className="contenedor-tiktok">
      <div className="contenedor-linea-tiempo">
        <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
      </div>

      {mostrarModal && (
        <FormularioSubida 
          archivo={archivoSeleccionado} 
          alCerrar={manejarCierreModal} 
        />
      )}

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
        <div className="tarjeta-preview" onClick={() => elegirManual(indexIzquierda, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', zIndex: 15 }}>
          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <button type="button" style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255, 0, 85, 0.4)', border: 'none', pointerEvents: 'none' }}>
              <div style={{ width: '18px', height: '18px', backgroundColor: '#ff0055', borderRadius: '50%' }}></div>
            </button>
            <input type="file" accept="video/*" capture="environment" onChange={prepararArchivo} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>

          <div style={{ position: 'relative', width: '48px', height: '48px' }}>
            <button type="button" style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', color: '#000000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 12px rgba(255,255,255,0.2)', border: 'none', pointerEvents: 'none' }}>📂</button>
            <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" onChange={prepararArchivo} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>
        </div>

        <div className="tarjeta-preview" onClick={() => elegirManual(indexDerecha, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <video className="video-thumbnail" src={`${previewDerecha.url_video}#t=0.5`} muted playsInline preload="metadata" />
        </div>
      </div>
    </div>
  );
}

export default App;