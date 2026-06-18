// src/MisVideos.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function MisVideos() {
  const [misVideos, setMisVideos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerMisVideos();
  }, []);

  async function obtenerMisVideos() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Filtramos en la base de datos para traer SOLO mis videos
      let { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setMisVideos(data || []);
    } catch (error) {
      console.error('Error cargando tus videos:', error.message);
    } finally {
      setCargando(false);
    }
  }

  const borrarVideo = async (id, urlVideo) => {
    const confirmar = window.confirm("¿Seguro que querés borrar este video? No se puede deshacer.");
    if (!confirmar) return;

    try {
      // 1. Extraer el nombre del archivo del Storage a partir de la URL
      // Ejemplo: de https://.../storage/v1/object/public/videos/video_123.mp4 saca 'video_123.mp4'
      const nombreArchivo = urlVideo.split('/').pop();

      // 2. Borrar del Storage de Supabase (reemplazá 'videos' por el nombre de tu bucket si es distinto)
      const { error: errorStorage } = await supabase.storage
        .from('videos') 
        .remove([nombreArchivo]);

      if (errorStorage) console.error("Aviso Storage:", errorStorage.message);

      // 3. Borrar el registro de la tabla 'videos'
      const { error: errorTabla } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (errorTabla) throw errorTabla;

      // 4. Actualizar la interfaz de usuario eliminando el video borrado del estado
      setMisVideos(prev => prev.filter(v => v.id !== id));
      alert("Video eliminado con éxito.");

    } catch (error) {
      alert("Error al borrar: " + error.message);
    }
  };

  if (cargando) return <div style={{ color: '#00ffcc', textAlign: 'center', marginTop: '50px' }}>Cargando tus archivos...</div>;

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#121212', minHeight: '100vh', paddingBottom: '90px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', fontFamily: 'sans-serif', color: '#00ffcc' }}>🎬 Mis Videos Subidos</h2>
      
      {misVideos.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>Todavía no subiste ningún video. ¡Estrená la cámara!</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '15px',
          marginTop: '20px'
        }}>
          {misVideos.map((video) => (
            <div key={video.id} style={{
              backgroundColor: '#1e1e1e',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #333',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Miniatura fija del video */}
              <video 
                src={`${video.url_video}#t=0.5`} 
                muted 
                playsInline 
                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              />
              
              <div style={{ padding: '10px', textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{
                  backgroundColor: '#333', color: '#00ffcc', padding: '3px 8px',
                  borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', marginBottom: '10px'
                }}>
                  {video.categoria}
                </span>
                
                <button
                  onClick={() => borrarVideo(video.id, video.url_video)}
                  style={{
                    backgroundColor: '#ff0055', color: '#fff', border: 'none',
                    padding: '8px 0', borderRadius: '6px', fontWeight: 'bold',
                    fontSize: '12px', cursor: 'pointer', width: '100%'
                  }}
                >
                  🗑️ Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MisVideos;