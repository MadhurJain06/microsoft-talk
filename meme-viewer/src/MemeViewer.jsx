import React, { useEffect, useState, useRef } from 'react';

function MemeViewer() {
  const [memes, setMemes] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [topTextPos, setTopTextPos] = useState({ x: 0.5, y: 0.08 });
  const [bottomTextPos, setBottomTextPos] = useState({ x: 0.5, y: 0.92 });
  const [dragging, setDragging] = useState(null); // 'top' or 'bottom' or null
  const [favourites, setFavourites] = useState([]);
  const [showFavourites, setShowFavourites] = useState(false);
  const imgRef = useRef();

  // Fetch memes from both APIs
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('https://api.imgflip.com/get_memes').then(res => res.json()),
      fetch('https://www.reddit.com/r/footballmemes/top.json?limit=50').then(res => res.json())
    ])
      .then(([imgflip, reddit]) => {
        const imgflipMemes = imgflip.data.memes.map(m => ({
          id: m.id,
          name: m.name,
          url: m.url,
          source: 'imgflip',
        }));
        const redditMemes = (reddit.data.children || [])
          .map(child => child.data)
          .filter(post => post.post_hint === 'image' && post.url)
          .map(post => ({
            id: post.id,
            name: post.title,
            url: post.url,
            source: 'reddit',
          }));
        setMemes([...imgflipMemes, ...redditMemes]);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load memes');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setTopText('');
    setBottomText('');
    setShowEdit(false);
    setTopTextPos({ x: 0.5, y: 0.08 });
    setBottomTextPos({ x: 0.5, y: 0.92 });
  }, [current]);

  // Drag handlers
  const handleMouseDown = (which) => (e) => {
    setDragging({ which, startX: e.clientX, startY: e.clientY });
  };
  const handleMouseUp = () => setDragging(null);
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = imgRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragging.startX) / rect.width;
    const dy = (e.clientY - dragging.startY) / rect.height;
    if (dragging.which === 'top') {
      setTopTextPos(pos => ({
        x: Math.min(1, Math.max(0, pos.x + dx)),
        y: Math.min(1, Math.max(0, pos.y + dy)),
      }));
    } else {
      setBottomTextPos(pos => ({
        x: Math.min(1, Math.max(0, pos.x + dx)),
        y: Math.min(1, Math.max(0, pos.y + dy)),
      }));
    }
    setDragging(d => ({ ...d, startX: e.clientX, startY: e.clientY }));
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  const nextMeme = () => {
    setCurrent((prev) => (prev + 1) % memes.length);
  };

  const prevMeme = () => {
    setCurrent((prev) => (prev - 1 + memes.length) % memes.length);
  };

  // Save favourite meme (by id)
  const toggleFavourite = () => {
    const id = memes[current]?.id;
    if (!id) return;
    setFavourites(favs => favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]);
  };

  // Get favourite meme objects
  const favouriteMemes = memes.filter(m => favourites.includes(m.id));

  const saveMeme = () => {
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Draw top text
    if (topText) {
      ctx.font = `${Math.floor(canvas.height/12)}px Impact, Arial Black, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      const x = topTextPos.x * canvas.width;
      const y = topTextPos.y * canvas.height;
      ctx.strokeText(topText.toUpperCase(), x, y);
      ctx.fillText(topText.toUpperCase(), x, y);
    }
    // Draw bottom text
    if (bottomText) {
      ctx.font = `${Math.floor(canvas.height/12)}px Impact, Arial Black, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      const x = bottomTextPos.x * canvas.width;
      const y = bottomTextPos.y * canvas.height;
      ctx.strokeText(bottomText.toUpperCase(), x, y);
      ctx.fillText(bottomText.toUpperCase(), x, y);
    }
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${memes[current].name.replace(/\s+/g, '_')}_meme.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  if (loading) return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh'}}>
      <div className="loader" style={{marginBottom: 16}}></div>
      <span style={{fontSize: 20, color: '#555'}}>Loading memes...</span>
    </div>
  );
  if (error) return <div style={{color: 'red', textAlign: 'center', marginTop: 40}}>{error}</div>;
  if (!memes.length) return <div style={{textAlign: 'center', marginTop: 40}}>No memes found.</div>;

  const meme = memes[current];

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', fontFamily: 'Segoe UI, Arial, sans-serif', padding: 24
    }}>
      {/* Favourites column */}
      <div style={{ width: 180, marginRight: 32 }}>
        <div style={{fontWeight: 700, fontSize: 18, marginBottom: 12, color: '#3730a3'}}>Favourites</div>
        <button onClick={() => setShowFavourites(f => !f)} style={{marginBottom: 12, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#a5b4fc', color: '#3730a3', fontWeight: 600, cursor: 'pointer'}}> {showFavourites ? 'Show All' : 'Show Favourites'} </button>
        <div style={{maxHeight: '70vh', overflowY: 'auto'}}>
          {favouriteMemes.length === 0 && <div style={{color: '#64748b', fontSize: 14}}>No favourites yet.</div>}
          {favouriteMemes.map(fav => (
            <div key={fav.id} style={{marginBottom: 12, cursor: 'pointer'}} onClick={() => setCurrent(memes.findIndex(m => m.id === fav.id))}>
              <img src={fav.url} alt={fav.name} style={{width: '100%', borderRadius: 8, boxShadow: '0 2px 8px #e0e7ff'}} />
              <div style={{fontSize: 13, color: '#3730a3', marginTop: 2, textAlign: 'center'}}>{fav.name}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Main meme viewer */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          padding: 32,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          marginBottom: 32
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
            <h2 style={{margin: 0, color: '#3730a3', fontWeight: 700, fontSize: 28, flex: 1}}>{meme.name}</h2>
            <span onClick={toggleFavourite} style={{cursor: 'pointer', fontSize: 28, marginLeft: 8, color: favourites.includes(meme.id) ? '#f59e42' : '#cbd5e1'}} title={favourites.includes(meme.id) ? 'Remove from favourites' : 'Add to favourites'}>★</span>
          </div>
          <div style={{position: 'relative', marginBottom: 24}}>
            <img ref={imgRef} src={meme.url} alt={meme.name} style={{ maxWidth: '100%', height: 'auto', borderRadius: 12, boxShadow: '0 2px 12px #c7d2fe', display: 'block' }} />
            {(topText || bottomText) && (
              <>
                {topText && (
                  <div
                    onMouseDown={showEdit ? handleMouseDown('top') : undefined}
                    style={{
                      position: 'absolute',
                      left: `${topTextPos.x * 100}%`,
                      top: `${topTextPos.y * 100}%`,
                      transform: 'translate(-50%, 0)',
                      cursor: showEdit ? 'move' : 'default',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: 28,
                      textShadow: '2px 2px 8px #000',
                      pointerEvents: showEdit ? 'auto' : 'none',
                      textTransform: 'uppercase',
                      padding: '0 8px',
                      wordBreak: 'break-word',
                      userSelect: 'none',
                    }}
                  >{topText}</div>
                )}
                {bottomText && (
                  <div
                    onMouseDown={showEdit ? handleMouseDown('bottom') : undefined}
                    style={{
                      position: 'absolute',
                      left: `${bottomTextPos.x * 100}%`,
                      top: `${bottomTextPos.y * 100}%`,
                      transform: 'translate(-50%, 0)',
                      cursor: showEdit ? 'move' : 'default',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: 28,
                      textShadow: '2px 2px 8px #000',
                      pointerEvents: showEdit ? 'auto' : 'none',
                      textTransform: 'uppercase',
                      padding: '0 8px',
                      wordBreak: 'break-word',
                      userSelect: 'none',
                    }}
                  >{bottomText}</div>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
            <button onClick={prevMeme} style={{
              padding: '10px 24px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px #e0e7ff'
            }}>Previous</button>
            <button onClick={nextMeme} style={{
              padding: '10px 24px',
              background: '#a5b4fc',
              color: '#3730a3',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px #e0e7ff'
            }}>Next</button>
            <button onClick={() => setShowEdit(v => !v)} style={{
              padding: '10px 24px',
              background: showEdit ? '#f59e42' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px #e0e7ff'
            }}>{showEdit ? 'Hide Editor' : 'Edit Text'}</button>
            <button onClick={saveMeme} style={{
              padding: '10px 24px',
              background: '#f59e42',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px #e0e7ff'
            }}>Save Meme</button>
          </div>
          {showEdit && (
            <div style={{marginBottom: 16}}>
              <input
                type="text"
                placeholder="Top text"
                value={topText}
                onChange={e => setTopText(e.target.value)}
                style={{
                  width: '90%',
                  padding: '8px 12px',
                  marginBottom: 8,
                  borderRadius: 6,
                  border: '1px solid #c7d2fe',
                  fontSize: 16
                }}
                maxLength={60}
              />
              <input
                type="text"
                placeholder="Bottom text"
                value={bottomText}
                onChange={e => setBottomText(e.target.value)}
                style={{
                  width: '90%',
                  padding: '8px 12px',
                  marginBottom: 8,
                  borderRadius: 6,
                  border: '1px solid #c7d2fe',
                  fontSize: 16
                }}
                maxLength={60}
              />
              <div style={{fontSize: 13, color: '#64748b', marginTop: 4}}>
                Drag the text on the image to reposition it.
              </div>
            </div>
          )}
          <div style={{marginTop: 8, color: '#64748b', fontSize: 14}}>
            Meme {current + 1} of {memes.length}
          </div>
        </div>
        <style>{`
          .loader {
            border: 6px solid #e0e7ff;
            border-top: 6px solid #6366f1;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default MemeViewer;
