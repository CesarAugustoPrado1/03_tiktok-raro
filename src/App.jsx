import React, { useState, useRef } from 'react';
import MisVideos from './MisVideos.jsx';
import FormularioSubida from './FormularioSubida.jsx';
import { useVideos } from './useVideos.js';
import { supabase } from './supabaseClient';
import './App.css?v=1.0.1';

/**
 * Componente Principal de la Aplicación (TikTok Clone).
 * Maneja las vistas visuales, eventos de UI y reproducción multimedia.
 */
function App() {
  // Importamos toda la lógica pesada desde nuestro hook modular
  const {
    sesion,
    listaVideos,
    videoPrincipal,
    usuarioDioLike,
    likesContador,
    previewIzquierda,
    previewDerecha,
    previewsFijas,
    descargarVideosGlobales,
    manejarBotonLike,
    cambiarVideo,
    alTerminarVideoCompleto,
    elegirManual
  } = useVideos();

  // Estados locales exclusivos de la Interfaz Visual (UI)
  const [vistaActiva, setVistaActiva] = useState('feed'); // Vistas: 'feed' | 'descubrir' | 'mis-videos'
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarMenuOrigen, setMostrarMenuOrigen] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  // Referencias a elementos del DOM nativo
  const videoRef = useRef(null);
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  // Actualiza visualmente la pequeña barra horizontal de progreso del video
  function controlarProgresoVideo() {
    if (videoRef.current) {
      const actual = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      setProgreso((actual / total) * 100);
    }
  }

  // Disparadores para abrir selectores nativos de archivos del celular/PC
  function manejarEleccionOrigen(origen) {
    setMostrarMenuOrigen(false);
    if (origen === 'camara' && inputCamaraRef.current) inputCamaraRef.current.click();
    if (origen === 'galeria' && inputGaleriaRef.current) inputGaleriaRef.current.click();
  }

  // Captura el archivo multimedia y abre el asistente de publicación
  function prepararArchivo(e) {
    const file = e.target.files[0];
    if (file) {
      setArchivoSeleccionado(file);
      setMostrarModal(true);
    }
  }

  // Callback ejecutado cuando el modal de subida finaliza
  function manejarCierreModal(recargar) {
    setMostrarModal(false);
    setArchivoSeleccionado(null);
    if (recargar) descargarVideosGlobales();
    if (videoRef.current && vistaActiva === 'feed' && listaVideos.length > 0) {
      videoRef.current.play();
    }
  }

  // Filtro de barra de búsqueda en tiempo real
  const videosFiltrados = listaVideos.filter(v => {
    const termino = terminoBusqueda.toLowerCase();
    return (
      v.titulo?.toLowerCase().includes(termino) ||
      v.categoria?.toLowerCase().includes(termino) ||
      v.sub_categoria?.toLowerCase().includes(termino)
    );
  });

  return (
    <div className="contenedor-tiktok">
      
      {/* Botón Flotante: Cerrar Sesión */}
      <button 
        onClick={() => supabase.auth.signOut()}
        style={{
          position: 'absolute', top: '15px', right: '15px', zIndex: '80',
          backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold',
          backdropFilter: 'blur(5px)'
        }}
      >
        🚪 Salir
      </button>

      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        
        {/* ========================================== VISTA: FEED PRINCIPAL ========================================== */}
        {vistaActiva === 'feed' && (
          <>
            {!videoPrincipal ? (
              <div style={{ color: '#888', textAlign: 'center', paddingTop: '35vh', paddingLeft: '20px', paddingRight: '20px', fontFamily: 'sans-serif', zIndex: '20', position: 'relative' }}>
                <p style={{ color: '#00ffcc', fontSize: '18px', fontWeight: 'bold' }}>✨ ¡Plataforma lista!</p>
                <p style={{ fontSize: '14px', lineHeight: '1.5' }}>Todavía no hay videos globales.<br />Tocá el botón <b>+</b> para subir el primero.</p>
              </div>
            ) : (
              <>
                {/* Indicador superior de progreso */}
                <div className="contenedor-linea-tiempo" style={{ zIndex: '30' }}>
                  <div className="linea-progreso" style={{ width: `${progreso}%` }}></div>
                </div>

                {/* Reproductor de Video en Pantalla Completa */}
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: '10', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video
                    ref={videoRef}
                    className="reproductor-principal-full"
                    src={videoPrincipal.url_video}
                    autoPlay
                    playsInline
                    muted
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
                </div>

                {/* Botón de Likes lateral derecho */}
                <div style={{ position: 'absolute', right: '15px', bottom: '260px', zIndex: '70', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={manejarBotonLike}
                      style={{
                        width: '50px', height: '50px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.6)', color: usuarioDioLike ? '#ff0055' : '#ffffff',
                        fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.2s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                        transform: usuarioDioLike ? 'scale(1.15)' : 'scale(1)'
                      }}
                    >
                      ❤️
                    </button>
                    <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', textShadow: '2px 2px 4px #000', fontFamily: 'sans-serif' }}>
                      {likesContador}
                    </span>
                  </div>
                </div>

                {/* Panel inferior interactivo (Previews y Barra de Navegación) */}
                <div className="panel-inferior-feed" style={{ zIndex: '70' }}>
                  <div className="barra-previews">
                    {previewIzquierda && (
                      <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.izq, previewIzquierda.categoria)}>
                        <span className="badge-categoria">{previewIzquierda.categoria}</span>
                        <video className="video-thumbnail" src={`${previewIzquierda.url_video}#t=0.5`} muted playsInline preload="metadata" />
                      </div>
                    )}

                    {/* Botón central para añadir contenido */}
                    <div style={{ width: '56px', height: '56px', zIndex: '75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button 
                        onClick={() => { if (videoRef.current) videoRef.current.pause(); setMostrarMenuOrigen(true); }}
                        style={{ width: '52px', height: '52px', backgroundColor: '#00ffcc', color: '#000', borderRadius: '50%', fontSize: '28px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0, 255, 204, 0.6)', border: 'none', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>

                    {previewDerecha && (
                      <div className="tarjeta-preview" onClick={() => elegirManual(previewsFijas.der, previewDerecha.categoria)}>
                        <span className="badge-categoria">{previewDerecha.categoria}</span>
                        <video className="video-thumbnail" src={`${previewDerecha.url_video}#t=0.5`} muted playsInline preload="metadata" />
                      </div>
                    )}
                  </div>

                  {/* Menu Tabs de navegación principal */}
                  <div style={{ width: '100%', height: '60px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', boxSizing: 'border-box' }}>
                    <button onClick={() => { setVistaActiva('feed'); setTimeout(() => { if (videoRef.current && listaVideos.length > 0) videoRef.current.play(); }, 100); }} style={{ background: 'none', border: 'none', color: vistaActiva === 'feed' ? '#00ffcc' : '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🏠 Inicio</button>
                    <button onClick={() => { if (videoRef.current) videoRef.current.pause(); setVistaActiva('descubrir'); }} style={{ background: 'none', border: 'none', color: vistaActiva === 'descubrir' ? '#00ffcc' : '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🔍 Descubrir</button>
                    <button onClick={() => { if (videoRef.current) videoRef.current.pause(); setVistaActiva('mis-videos'); }} style={{ background: 'none', border: 'none', color: vistaActiva === 'mis-videos' ? '#00ffcc' : '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🎬 Mis Videos</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ========================================== VISTA: DESCUBRIR ========================================== */}
        {vistaActiva === 'descubrir' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% - 75px)', padding: '20px', paddingTop: '60px', fontFamily: 'sans-serif', color: '#fff', overflowY: 'auto', zIndex: '20', backgroundColor: '#000' }}>
            <h2 style={{ color: '#00ffcc', fontSize: '22px', marginBottom: '15px' }}>Descubrir Contenido 🔍</h2>
            <input 
              type="text" placeholder="Buscar por título, categoría..." value={terminoBusqueda} onChange={(e) => setTerminoBusqueda(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#161616', color: '#fff', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {videosFiltrados.map((vid) => {
                const idx = listaVideos.findIndex(v => v.id === vid.id);
                return (
                  <div key={vid.id} onClick={() => { setVistaActiva('feed'); setTimeout(() => cambiarVideo(idx), 150); }} style={{ backgroundColor: '#121212', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', backgroundColor: '#000' }}>
                      <video src={`${vid.url_video}#t=0.5`} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#00ffcc', color: '#000', fontSize: '10px', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{vid.categoria}</span>
                    </div>
                    <div style={{ padding: '8px' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vid.titulo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== VISTA: MIS VIDEOS ========================================== */}
        {vistaActiva === 'mis-videos' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'calc(100% - 75px)', overflowY: 'auto', zIndex: '20', backgroundColor: '#000' }}>
            <MisVideos />
          </div>
        )}
      </div>

      {/* Modals globales de Carga e Ingesta de Datos */}
      {mostrarModal && <FormularioSubida archivo={archivoSeleccionado} alCerrar={manejarCierreModal} />}

      {mostrarMenuOrigen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: '100', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#1e1e1e', border: '2px solid #00ffcc', borderRadius: '16px', padding: '25px', width: '85%', maxWidth: '320px', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '18px' }}>¿Qué querés hacer?</h3>
            <button onClick={() => manejarEleccionOrigen('camara')} style={{ width: '100%', padding: '14px', marginBottom: '12px', backgroundColor: '#00ffcc', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🎥 Grabar con Cámara</button>
            <button onClick={() => manejarEleccionOrigen('galeria')} style={{ width: '100%', padding: '14px', marginBottom: '20px', backgroundColor: '#2e2e2e', color: '#fff', border: '1px solid #444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📂 Buscar en Galería</button>
            <span onClick={() => { setMostrarMenuOrigen(false); if (videoRef.current && vistaActiva === 'feed' && listaVideos.length > 0) videoRef.current.play(); }} style={{ color: '#ff0055', cursor: 'pointer' }}>Cancelar</span>
          </div>
        </div>
      )}

      {/* Capturadores nativos ocultos */}
      <input type="file" accept="video/*" capture="environment" ref={inputCamaraRef} onChange={prepararArchivo} style={{ display: 'none' }} />
      <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" ref={inputGaleriaRef} onChange={prepararArchivo} style={{ display: 'none' }} />
    </div>
  );
}

export default App;