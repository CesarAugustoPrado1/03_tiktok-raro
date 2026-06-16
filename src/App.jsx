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

  // Estados para delegar el control al componente modal de subida a Supabase
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  // [NUEVO] Estado para mostrar/ocultar el menú de elección (Cámara vs Galería)
  const [mostrarMenuOrigen, setMostrarMenuOrigen] = useState(false);

  // El cerebro dinámico del algoritmo
  const [intereses, setIntereses] = useState({
    futbol: 5, noticias: 5, cocina: 5, tecnologia: 5,
    autos: 5, fitness: 5, gaming: 5, musica: 5, humor: 5,
    viajes: 5, cine: 5, finanzas: 5, moda: 5, mascotas: 5, educacion: 5
  });

  // Estado para fijar las previews al inicio de cada video
  const [previewsFijas, setPreviewsFijas] = useState({ izq: 0, der: 0 });

  const videoRef = useRef(null);
  const tiempoEntradaRef = useRef(Date.now());

  // [NUEVO] Referencias a los inputs invisibles para poder clickearlos por código
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  // Cargar videos desde la base de datos al iniciar
  useEffect(() => {
    async function obtenerVideos() {
      try {
        let { data, error } = await supabase.from('videos').select('*');
        if (error) throw new Error(`Error de Supabase: ${error.message}`);

        if (data && data.length > 0) {
          setListaVideos(data);
          setErrorApp(null);

          const iniciales = calcularPreviewsFijasInstantes(data, 0, {
            futbol: 5, noticias: 5, cocina: 5, tecnologia: 5,
            autos: 5, fitness: 5, gaming: 5, musica: 5, humor: 5,
            viajes: 5, cine: 5, finanzas: 5, moda: 5, mascotas: 5, educacion: 5
          });
          setPreviewsFijas(iniciales);
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
    
    cambiarVideo(previewsFijas.izq);
  };

  const calcularPreviewsFijasInstantes = (videos, indexActual, puntosInteres) => {
    if (videos.length <= 1) return { izq: 0, der: 0 };

    let categoriaFavorita = 'futbol';
    let maxPuntos = -999;
    Object.keys(puntosInteres).forEach(cat => {
      if (puntosInteres[cat] > maxPuntos) {
        maxPuntos = puntosInteres[cat];
        categoriaFavorita = cat;
      }
    });

    let opcionesIzquierda = videos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indexActual && v.categoria === categoriaFavorita);

    if (opcionesIzquierda.length === 0) {
      opcionesIzquierda = videos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indexActual);
    }
    const izq = opcionesIzquierda[Math.floor(Math.random() * opcionesIzquierda.length)].originalIndex;

    let opcionesDerecha = videos.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.originalIndex !== indexActual && v.originalIndex !== izq);

    if (opcionesDerecha.length === 0) {
      opcionesDerecha = videos.map((v, i) => ({ ...v, originalIndex: i }))
        .filter(v => v.originalIndex !== indexActual);
    }
    
    const opcionesVariadas = opcionesDerecha.filter(v => v.categoria !== categoriaFavorita);
    const poolFinalDerecha = opcionesVariadas.length > 0 ? opcionesVariadas : opcionesDerecha;
    const der = poolFinalDerecha[Math.floor(Math.random() * poolFinalDerecha.length)].originalIndex;

    return { izq, der };
  };

  const elegirManual = (nuevoIndice, categoriaElegida) => {
    setIntereses(prev => ({ ...prev, [categoriaElegida]: (prev[categoriaElegida] || 0) + 10 }));
    cambiarVideo(nuevoIndice);
  };

  const cambiarVideo = (nuevoIndice) => {
    const tiempoPermanencia = (Date.now() - tiempoEntradaRef.current) / 1000;
    const videoAnterior = listaVideos[indiceActual];
    
    let nuevosIntereses = { ...intereses };
    if (tiempoPermanencia < 3 && videoAnterior) {
      nuevosIntereses[videoAnterior.categoria] = Math.max(0, (intereses[videoAnterior.categoria] || 0) - 3);
      setIntereses(nuevosIntereses);
    }

    setProgreso(0);
    tiempoEntradaRef.current = Date.now();
    setIndiceActual(nuevoIndice);

    const proximasPreviews = calcularPreviewsFijasInstantes(listaVideos, nuevoIndice, nuevosIntereses);
    setPreviewsFijas(proximasPreviews);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = listaVideos[nuevoIndice].url_video;
      videoRef.current.load();
    }
  };

  // [NUEVO] El usuario eligió una de las dos opciones del menú intermedio
  const manejarEleccionOrigen = (tipo) => {
    setMostrarMenuOrigen(false); // Cierra la ventanita
    if (tipo === 'camara') {
      inputCamaraRef.current.click(); // Fuerza la apertura de la cámara real
    } else if (tipo === 'galeria') {
      inputGaleriaRef.current.click(); // Fuerza la apertura de la galería/archivos
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
  const previewIzquierda = listaVideos[previewsFijas.izq];
  const previewDerecha = listaVideos[previewsFijas.der];

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

      {/* [NUEVO] MENÚ FLOTANTE INTERMEDIO DE ELECCIÓN */}
      {mostrarMenuOrigen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '2px solid #00ffcc',
            borderRadius: '16px',
            padding: '25px',
            width: '85%',
            maxWidth: '320px',
            textAlign: 'center',
            boxShadow: '0 0 25px rgba(0, 255, 204, 0.3)'
          }}>
            <h3 style={{ color: '#ffffff', margin: '0 0 20px 0', fontSize: '18px', fontFamily: 'sans-serif' }}>
              ¿Qué querés hacer?
            </h3>
            
            <button 
              onClick={() => manejarEleccionOrigen('camara')}
              style={{
                width: '100%', padding: '14px', marginBottom: '12px',
                backgroundColor: '#00ffcc', color: '#000000',
                border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer'
              }}
            >
              🎥 Grabar con Cámara
            </button>

            <button 
              onClick={() => manejarEleccionOrigen('galeria')}
              style={{
                width: '100%', padding: '14px', marginBottom: '20px',
                backgroundColor: '#2e2e2e', color: '#ffffff',
                border: '1px solid #444', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer'
              }}
            >
              📂 Buscar en Galería
            </button>

            <span 
              onClick={() => setMostrarMenuOrigen(false)}
              style={{ color: '#ff0055', fontSize: '14px', cursor: 'pointer', display: 'inline-block', fontWeight: '500' }}
            >
              Cancelar
            </span>
          </div>
        </div>
      )}

      {/* INPUTS DE CONTROL INVISIBLES FORZADOS POR REF */}
      {/* El de cámara lleva capture="environment" sí o sí para obligar al celu a abrir el lente trasero */}
      <input 
        type="file" 
        accept="video/*" 
        capture="environment" 
        ref={inputCamaraRef} 
        onChange={prepararArchivo} 
        style={{ display: 'none' }} 
      />
      {/* El de galería va libre para que explore archivos */}
      <input 
        type="file" 
        accept="video/mp4,video/webm,video/ogg,video/*" 
        ref={inputGaleriaRef} 
        onChange={prepararArchivo} 
        style={{ display: 'none' }} 
      />

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
        <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.izq, previewIzquierda.categoria)}>
          <span className="badge-categoria">{previewIzquierda.categoria}</span>
          <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
        </div>

        {/* BOTÓN ÚNICO CENTRAL: Al tocarlo abre nuestro menú intermedio */}
        <div style={{ width: '56px', height: '56px', zIndex: 15 }}>
          <button 
            type="button" 
            onClick={() => {
              if (videoRef.current) videoRef.current.pause();
              setMostrarMenuOrigen(true);
            }}
            style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#00ffcc', 
              color: '#000000', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '28px', 
              fontWeight: 'bold', 
              boxShadow: '0 0 15px rgba(0, 255, 204, 0.6)', 
              border: 'none', 
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>

        <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.der, previewDerecha.categoria)}>
          <span className="badge-categoria">{previewDerecha.categoria}</span>
          <video className="video-thumbnail" src={`${previewDerecha.url_video}#t=0.5`} muted playsInline preload="metadata" />
        </div>
      </div>
    </div>
  );
}

export default App;