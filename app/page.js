"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Info, X, ChevronLeft, Maximize, Minimize } from 'lucide-react';
import * as THREE from 'three';

export default function WebXRCinema() {
  const containerRef = useRef(null);
  const [isVRSupported, setIsVRSupported] = useState(false);
  const [isInVR, setIsInVR] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showMenu, setShowMenu] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHotspotInfo, setShowHotspotInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sceneRef = useRef(null);
  const videoRef = useRef(null);

  const videos = [
    {
      id: 1,
      title: "Square Drive Type - TSL Series",
      url: "/videos/vr-tsl-and-thl.mp4",
      hotspots: [
        { time: 5, title: "Drive Mechanism", description: "Square drive system for maximum torque transfer" },
        { time: 15, title: "Build Quality", description: "High-grade steel construction with corrosion resistance" }
      ]
    },
    {
      id: 2,
      title: "Pipe Cutting",
      url: "/videos/vr-pipecutting.mp4",
      hotspots: [
        { time: 8, title: "Rachet System", description: "72-tooth ratchet mechanism for precision work" },
        { time: 20, title: "Compact Design", description: "Low profile head for tight spaces" }
      ]
    },
    {
      id: 3,
      title: "Hottaping",
      url: "/videos/vr-hottaping.mp4",
      hotspots: [
        { time: 3, title: "Ultra Slim Profile", description: "Industry-leading slim design for maximum accessibility" },
        { time: 12, title: "Precision Engineering", description: "Micro-adjustable settings for fine-tuned control" }
      ]
    },
    {
      id: 4,
      title: "Retubing",
      url: "/videos/vr-retubing.mp4",
      hotspots: [
        { time: 3, title: "Ultra Slim Profile", description: "Industry-leading slim design for maximum accessibility" },
        { time: 12, title: "Precision Engineering", description: "Micro-adjustable settings for fine-tuned control" }
      ]
    },
    {
      id: 5,
      title: "Tritorc Intro",
      url: "/videos/tritorc-intro.mp4",
      hotspots: [
        { time: 3, title: "Ultra Slim Profile", description: "Industry-leading slim design for maximum accessibility" },
        { time: 12, title: "Precision Engineering", description: "Micro-adjustable settings for fine-tuned control" }
      ]
    }
  ];

  useEffect(() => {
    // ✅ Quest-compatible WebXR detection
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        console.log('WebXR VR supported:', supported);
        setIsVRSupported(supported);
      }).catch((err) => {
        console.error('WebXR check failed:', err);
        setIsVRSupported(false);
      });
    } else {
      console.log('WebXR not available in navigator');
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !selectedVideo) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // ✅ Quest-optimized camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 3); // Eye level for Quest

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // ✅ Quest-specific XR configuration
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor'); // Use floor tracking

    containerRef.current.appendChild(renderer.domElement);

    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = isMuted;
    video.playsInline = true;
    video.src = selectedVideo.url;
    videoRef.current = video;

    video.addEventListener('loadedmetadata', () => {
      setDuration(video.duration);
    });

    video.addEventListener('timeupdate', () => {
      setProgress((video.currentTime / video.duration) * 100);
    });

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    // ✅ FLAT cinema screen (not 360°)
    const aspectRatio = 16 / 9;
    const screenWidth = 8; // 8 meters wide
    const screenHeight = screenWidth / aspectRatio;
    
    const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
      map: videoTexture,
      side: THREE.DoubleSide
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    
    // Position screen in front of viewer at eye level
    screen.position.set(0, 1.6, -6); // 6 meters away, at eye level
    scene.add(screen);

    // Add ambient lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Add subtle environment
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x111111,
      side: THREE.DoubleSide 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Hotspot indicators
    const hotspotMeshes = [];
    selectedVideo.hotspots.forEach((hotspot, index) => {
      const hotspotGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const hotspotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6b00,
        transparent: true,
        opacity: 0
      });
      const hotspotMesh = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
      
      // Position hotspots below the screen
      const xPos = (index - selectedVideo.hotspots.length / 2 + 0.5) * 1.5;
      hotspotMesh.position.set(xPos, 0.5, -5);
      hotspotMesh.userData = hotspot;
      
      scene.add(hotspotMesh);
      hotspotMeshes.push(hotspotMesh);
    });

    sceneRef.current = { 
      scene, 
      camera, 
      renderer, 
      video, 
      hotspotMeshes,
      screen 
    };

    // Mouse/touch controls for non-VR mode
    let isUserInteracting = false;
    let lon = 0, lat = 0;
    let onPointerDownLon = 0, onPointerDownLat = 0;
    let onPointerDownX = 0, onPointerDownY = 0;

    const onPointerDown = (e) => {
      isUserInteracting = true;
      const clientX = e.clientX || e.touches?.[0]?.clientX;
      const clientY = e.clientY || e.touches?.[0]?.clientY;
      onPointerDownX = clientX;
      onPointerDownY = clientY;
      onPointerDownLon = lon;
      onPointerDownLat = lat;
    };

    const onPointerMove = (e) => {
      if (!isUserInteracting) return;
      const clientX = e.clientX || e.touches?.[0]?.clientX;
      const clientY = e.clientY || e.touches?.[0]?.clientY;
      lon = (onPointerDownX - clientX) * 0.1 + onPointerDownLon;
      lat = (clientY - onPointerDownY) * 0.1 + onPointerDownLat;
    };

    const onPointerUp = () => {
      isUserInteracting = false;
    };

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerUp);
    renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onPointerUp);

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.01;

      // Animate hotspots based on video time
      if (video && !video.paused) {
        const currentTime = video.currentTime;
        hotspotMeshes.forEach((mesh) => {
          const timeDiff = Math.abs(currentTime - mesh.userData.time);
          if (timeDiff < 2) {
            mesh.material.opacity = Math.max(0, 1 - timeDiff / 2);
            const scale = 1 + Math.sin(time * 3) * 0.2;
            mesh.scale.set(scale, scale, scale);
          } else {
            mesh.material.opacity = 0;
          }
        });
      }

      // Camera rotation in non-VR mode (look around)
      if (!renderer.xr.isPresenting) {
        lat = Math.max(-85, Math.min(85, lat));
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);

        camera.position.x = 3 * Math.sin(theta) * Math.cos(phi);
        camera.position.y = 1.6 + 3 * Math.sin(phi);
        camera.position.z = 3 * Math.cos(theta) * Math.cos(phi);
        camera.lookAt(screen.position);
      }

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mouseup', onPointerUp);
      renderer.domElement.removeEventListener('touchstart', onPointerDown);
      renderer.domElement.removeEventListener('touchmove', onPointerMove);
      renderer.domElement.removeEventListener('touchend', onPointerUp);
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      videoTexture.dispose();
      screenGeometry.dispose();
      screenMaterial.dispose();
    };
  }, [selectedVideo, isMuted]);

  const enterVR = async () => {
    if (sceneRef.current && isVRSupported) {
      try {
        // ✅ Quest-compatible session request
        const session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['bounded-floor', 'hand-tracking']
        });
        
        await sceneRef.current.renderer.xr.setSession(session);
        setIsInVR(true);
        
        // Auto-play video when entering VR
        if (videoRef.current && !isPlaying) {
          videoRef.current.play().catch(err => {
            console.log('Video autoplay prevented:', err);
          });
          setIsPlaying(true);
        }

        session.addEventListener('end', () => {
          setIsInVR(false);
        });
      } catch (err) {
        console.error('Failed to enter VR:', err);
        alert('Failed to enter VR mode. Error: ' + err.message);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const selectVideo = (video) => {
    setSelectedVideo(video);
    setShowMenu(false);
    setIsPlaying(false);
    setProgress(0);
  };

  const backToMenu = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
    }
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    
    setIsPlaying(false);
    setSelectedVideo(null);
    setShowMenu(true);
    setShowHotspotInfo(null);
    setProgress(0);
    setDuration(0);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-900 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Main Menu */}
      {showMenu && !selectedVideo && (
        <div className="absolute inset-0 overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl w-full">
              <div className="text-center mb-3">
                <img
                  src="/images/logo.png"
                  alt="Tritorc Logo"
                  className="mx-auto mb-4 w-40 md:w-56 animate-fade-in"
                />
              </div>
              <div className="mb-8 sm:mb-12 lg:mb-16 text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl text-white font-light mb-2 sm:mb-4 px-4">
                  Virtual Cinema Experience
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-400 mb-4 sm:mb-6 px-4">
                  Watch your product videos in an immersive VR theater
                </p>
                {!isVRSupported && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 max-w-2xl mx-4 sm:mx-auto">
                    <p className="text-yellow-200 text-xs sm:text-sm">
                      ⚠️ WebXR not detected. For the full VR experience, please open this on Meta Quest browser.
                    </p>
                  </div>
                )}
              </div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 px-4">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => selectVideo(video)}
                    className="bg-gray-800 rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 group border-2 border-gray-700 hover:border-orange-500 w-full"
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                      <Play size={40} className="sm:w-12 sm:h-12 text-orange-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-4 sm:p-5 lg:p-6 text-left">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm">
                        <Info size={14} className="flex-shrink-0" />
                        <span>{video.hotspots.length} Interactive Points</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player UI - Rest of the component remains the same */}
      {selectedVideo && !isInVR && (
        <>
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 sm:p-4 lg:p-6 z-10">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <button
                onClick={backToMenu}
                className="bg-white/90 hover:bg-white text-gray-900 px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-all font-medium text-sm sm:text-base flex-shrink-0"
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Back</span>
              </button>
              
              <div className="text-white text-center flex-1 min-w-0 mx-2">
                <h2 className="text-sm sm:text-lg lg:text-xl font-bold drop-shadow-lg truncate">{selectedVideo.title}</h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-0.5 sm:mt-1 hidden sm:block">Drag to look around</p>
              </div>

              {isVRSupported && (
                <button
                  onClick={enterVR}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 sm:px-4 sm:py-2 lg:px-6 rounded-lg font-semibold transition-all shadow-lg text-xs sm:text-sm lg:text-base flex-shrink-0"
                >
                  <span className="hidden sm:inline">Enter VR</span>
                  <span className="sm:hidden">VR</span>
                </button>
              )}
            </div>
          </div>

          <div className="absolute top-16 sm:top-20 lg:top-24 left-0 right-0 px-3 sm:px-4 lg:px-6 z-10">
            <div className="bg-white/20 backdrop-blur-sm rounded-full h-1 sm:h-1.5 overflow-hidden">
              <div 
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white drop-shadow mt-1">
              <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 lg:p-6 z-10">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
              <button
                onClick={togglePlay}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-full flex items-center gap-1 sm:gap-2 transition-all font-semibold text-sm sm:text-base shadow-lg"
              >
                {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5" />}
                <span className="hidden xs:inline">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={toggleMute}
                className="bg-white/90 hover:bg-white text-gray-900 p-2 sm:p-3 rounded-full transition-all"
              >
                {isMuted ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="bg-white/90 hover:bg-white text-gray-900 p-2 sm:p-3 rounded-full transition-all"
              >
                {isFullscreen ? <Minimize size={18} className="sm:w-5 sm:h-5" /> : <Maximize size={18} className="sm:w-5 sm:h-5" />}
              </button>
            </div>

            <div className="flex justify-center gap-2 overflow-x-auto pb-2 px-2 scrollbar-hide">
              {selectedVideo.hotspots.map((hotspot, index) => (
                <button
                  key={index}
                  onClick={() => setShowHotspotInfo(hotspot)}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0"
                >
                  {hotspot.title}
                </button>
              ))}
            </div>
          </div>

          {showHotspotInfo && (
            <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowHotspotInfo(null)}
              />
              <div className="relative bg-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 max-w-sm sm:max-w-md lg:max-w-lg w-full mx-4 shadow-2xl border border-gray-700">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div className="flex-1 pr-3 sm:pr-4">
                    <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                      <Info size={14} />
                      Feature Detail
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                      {showHotspotInfo.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowHotspotInfo(null)}
                    className="text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full p-2 transition-colors flex-shrink-0"
                  >
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
                <p className="text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed mb-4 sm:mb-6">
                  {showHotspotInfo.description}
                </p>
                <button
                  onClick={() => setShowHotspotInfo(null)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isInVR && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 sm:px-6 py-2 rounded-full font-semibold shadow-lg z-50 text-xs sm:text-sm">
          🥽 VR Mode Active
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (min-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}