import { useEffect, useState, useRef } from 'react';
import { subscribeToPlaylists } from '../firebase/playlistService';
import { X } from 'lucide-react';
import './PlaylistPlayer.css';

const PlaylistPlayer = () => {
  const [activePlaylists, setActivePlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Subscribe to playlists
    const unsubscribe = subscribeToPlaylists((playlists) => {
      // Filter active playlists that should play now
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentTime = currentHour * 60 + currentMinute; // Convert to minutes

      const activeNow = playlists.filter(playlist => {
        if (!playlist.isActive || !playlist.items || playlist.items.length === 0) {
          return false;
        }

        // Check if current day is in schedule
        if (!playlist.schedule?.days?.includes(currentDay)) {
          return false;
        }

        // Parse schedule times
        const [startHour, startMinute] = (playlist.schedule.start || '09:00').split(':').map(Number);
        const [endHour, endMinute] = (playlist.schedule.end || '17:00').split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        // Check if current time is within schedule
        return currentTime >= startTime && currentTime <= endTime;
      });

      setActivePlaylists(activeNow);

      // Set the first active playlist as current
      if (activeNow.length > 0 && !currentPlaylist) {
        setCurrentPlaylist(activeNow[0]);
        setCurrentItemIndex(0);
        setIsPlaying(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-play items in sequence
    if (isPlaying && currentPlaylist && currentPlaylist.items && currentPlaylist.items.length > 0) {
      const currentItem = currentPlaylist.items[currentItemIndex];
      
      if (currentItem) {
        const duration = (currentItem.duration || 10) * 1000; // Convert to milliseconds

        timerRef.current = setTimeout(() => {
          // Move to next item or loop
          if (currentItemIndex < currentPlaylist.items.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
          } else {
            // Loop back to start if loop is enabled, or stop
            if (currentItem.loop || currentPlaylist.items.some(item => item.loop)) {
              setCurrentItemIndex(0);
            } else {
              setCurrentItemIndex(0); // Always loop for now
            }
          }
        }, duration);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, currentPlaylist, currentItemIndex]);

  const handleClose = () => {
    setIsPlaying(false);
    setCurrentPlaylist(null);
    setCurrentItemIndex(0);
  };

  // Don't render if no active playlist
  if (!isPlaying || !currentPlaylist || !currentPlaylist.items || currentPlaylist.items.length === 0) {
    return null;
  }

  const currentItem = currentPlaylist.items[currentItemIndex];

  if (!currentItem) {
    return null;
  }

  const renderMedia = () => {
    switch (currentItem.type) {
      case 'image':
        return (
          <img
            src={currentItem.url || currentItem.thumbnail}
            alt={currentItem.name}
            className="player-media"
          />
        );
      
      case 'video':
        return (
          <video
            key={currentItem.id}
            src={currentItem.url}
            autoPlay
            muted
            onEnded={() => {
              // Move to next item when video ends
              if (currentItemIndex < currentPlaylist.items.length - 1) {
                setCurrentItemIndex(currentItemIndex + 1);
              } else {
                setCurrentItemIndex(0);
              }
            }}
            className="player-media"
          />
        );
      
      case 'document':
      case 'pdf':
        return (
          <iframe
            src={currentItem.url}
            className="player-media"
            title={currentItem.name}
          />
        );
      
      case 'text':
        return (
          <div
            className="player-text"
            style={{
              backgroundColor: currentItem.textStyle?.backgroundColor || '#1e40af',
              color: currentItem.textStyle?.color || '#ffffff',
              fontSize: `${currentItem.textStyle?.fontSize || 48}px`,
              fontWeight: currentItem.textStyle?.fontWeight || 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: '40px',
              textAlign: 'center',
              wordWrap: 'break-word'
            }}
          >
            {currentItem.textContent || 'No text content'}
          </div>
        );
      
      default:
        return (
          <div className="player-placeholder">
            <p>{currentItem.name}</p>
          </div>
        );
    }
  };

  return (
    <div className="playlist-player">
      <div className="player-header">
        <div className="player-info">
          <span className="player-playlist-name">{currentPlaylist.name}</span>
          <span className="player-item-info">
            Playing: {currentItem.name} ({currentItemIndex + 1}/{currentPlaylist.items.length})
          </span>
        </div>
        <button onClick={handleClose} className="player-close-btn">
          <X size={24} />
        </button>
      </div>
      
      <div className="player-content">
        {renderMedia()}
      </div>

      <div className="player-footer">
        <div className="player-progress">
          <div 
            className="player-progress-bar" 
            style={{ 
              width: `${((currentItemIndex + 1) / currentPlaylist.items.length) * 100}%` 
            }}
          />
        </div>
        <div className="player-status">
          Duration: {currentItem.duration || 10}s | 
          Scheduled: {currentPlaylist.schedule?.start} - {currentPlaylist.schedule?.end}
        </div>
      </div>
    </div>
  );
};

export default PlaylistPlayer;
