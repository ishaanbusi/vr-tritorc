"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, Maximize, RotateCw, ChevronLeft, Info, X, Volume2, VolumeX, Minimize } from 'lucide-react';

export default function VRVideoViewer() {
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showHotspotInfo, setShowHotspotInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const sceneRef = useRef(null);
  const videoRef = useRef(null);
  const hotspotsRef = useRef([]);
  const animationRef = useRef(null);

  const videos = [
    {
      id: 1,
      title: "Square Drive Type - TSL Series",
      thumbnail: "https://via.placeholder.com/400x225/6B7280/FFFFFF?text=TSL+Series",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      hotspots: [
        { position: [250, 50, 0], title: "Drive Mechanism", description: "Square drive system for maximum torque transfer" },
        { position: [-200, 0, 100], title: "Build Quality", description: "High-grade steel construction with corrosion resistance" }
      ]
    },
    {
      id: 2,
      title: "Low Profile Rachet Type - THL Series",
      thumbnail: "https://via.placeholder.com/400x225/6B7280/FFFFFF?text=THL+Rachet",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      hotspots: [
        { position: [200, 100, -50], title: "Rachet System", description: "72-tooth ratchet mechanism for precision work" },
        { position: [-150, -50, 150], title: "Compact Design", description: "Low profile head for tight spaces" }
      ]
    },
    {
      id: 3,
      title: "Low Profile Ultra Slim Type - THL Series",
      thumbnail: "https://via.placeholder.com/400x225/6B7280/FFFFFF?text=THL+Ultra+Slim",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      hotspots: [
        { position: [0, 0, 250], title: "Ultra Slim Profile", description: "Industry-leading slim design for maximum accessibility" },
        { position: [150, 100, 0], title: "Precision Engineering", description: "Micro-adjustable settings for fine-tuned control" }
      ]
    }
  ];

  useEffect(() => {
    if (!containerRef.current || !selectedVideo) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

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

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ map: videoTexture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    hotspotsRef.current = [];
    selectedVideo.hotspots.forEach((hotspot, index) => {
      const hotspotGroup = new THREE.Group();
      
      const hotspotGeometry = new THREE.SphereGeometry(8, 16, 16);
      const hotspotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1F2937,
        transparent: true,
        opacity: 0.9
      });
      const hotspotMesh = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
      hotspotMesh.userData = { index, ...hotspot };
      
      const ring1 = new THREE.RingGeometry(10, 12, 32);
      const ringMaterial1 = new THREE.MeshBasicMaterial({ 
        color: 0x374151, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ringMesh1 = new THREE.Mesh(ring1, ringMaterial1);
      
      const ring2 = new THREE.RingGeometry(14, 16, 32);
      const ringMaterial2 = new THREE.MeshBasicMaterial({ 
        color: 0x6B7280, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ringMesh2 = new THREE.Mesh(ring2, ringMaterial2);
      
      hotspotGroup.add(hotspotMesh);
      hotspotGroup.add(ringMesh1);
      hotspotGroup.add(ringMesh2);
      hotspotGroup.position.set(...hotspot.position);
      
      hotspotMesh.userData.rings = [ringMesh1, ringMesh2];
      scene.add(hotspotGroup);
      hotspotsRef.current.push(hotspotMesh);
    });

    sceneRef.current = { scene, camera, renderer, video };

    let isUserInteracting = false;
    let onPointerDownX = 0, onPointerDownY = 0;
    let lon = 0, lat = 0;
    let onPointerDownLon = 0, onPointerDownLat = 0;
    let phi = 0, theta = 0;

    const onPointerDown = (e) => {
      isUserInteracting = true;
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      onPointerDownX = clientX;
      onPointerDownY = clientY;
      onPointerDownLon = lon;
      onPointerDownLat = lat;
    };

    const onPointerMove = (e) => {
      if (!isUserInteracting) return;
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      lon = (onPointerDownX - clientX) * 0.1 + onPointerDownLon;
      lat = (clientY - onPointerDownY) * 0.1 + onPointerDownLat;
    };

    const onPointerUp = () => {
      isUserInteracting = false;
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onHotspotClick = (e) => {
      if (isUserInteracting) return;
      
      const clientX = e.clientX || e.changedTouches[0]?.clientX;
      const clientY = e.clientY || e.changedTouches[0]?.clientY;
      
      if (!clientX || !clientY) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspotsRef.current);

      if (intersects.length > 0) {
        const hotspot = intersects[0].object.userData;
        setShowHotspotInfo(hotspot);
      }
    };

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerUp);
    renderer.domElement.addEventListener('click', onHotspotClick);
    renderer.domElement.addEventListener('touchstart', onPointerDown);
    renderer.domElement.addEventListener('touchmove', onPointerMove);
    renderer.domElement.addEventListener('touchend', (e) => {
      onPointerUp();
      onHotspotClick(e);
    });

    let alpha = 0, beta = 0, gamma = 0;
    
    const handleOrientation = (e) => {
      if (!gyroEnabled) return;
      alpha = e.alpha || 0;
      beta = e.beta || 0;
      gamma = e.gamma || 0;
    };

    window.addEventListener('deviceorientation', handleOrientation);

    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.01;

      hotspotsRef.current.forEach((hotspot) => {
        const scale = 1 + Math.sin(time * 2) * 0.15;
        hotspot.scale.set(scale, scale, scale);
        
        if (hotspot.userData.rings) {
          hotspot.userData.rings.forEach((ring, idx) => {
            ring.lookAt(camera.position);
            const ringScale = scale * (1.2 + idx * 0.2);
            ring.scale.set(ringScale, ringScale, 1);
            ring.rotation.z = time * (idx + 1) * 0.5;
          });
        }
      });

      if (gyroEnabled && alpha !== 0) {
        const alphaRad = THREE.MathUtils.degToRad(alpha);
        const betaRad = THREE.MathUtils.degToRad(beta);
        const gammaRad = THREE.MathUtils.degToRad(gamma);

        camera.rotation.order = 'YXZ';
        camera.rotation.y = alphaRad;
        camera.rotation.x = betaRad - Math.PI / 2;
        camera.rotation.z = -gammaRad;
      } else {
        lat = Math.max(-85, Math.min(85, lat));
        phi = THREE.MathUtils.degToRad(90 - lat);
        theta = THREE.MathUtils.degToRad(lon);

        camera.position.x = 0.1 * Math.sin(phi) * Math.cos(theta);
        camera.position.y = 0.1 * Math.cos(phi);
        camera.position.z = 0.1 * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('deviceorientation', handleOrientation);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mouseup', onPointerUp);
      renderer.domElement.removeEventListener('click', onHotspotClick);
      renderer.domElement.removeEventListener('touchstart', onPointerDown);
      renderer.domElement.removeEventListener('touchmove', onPointerMove);
      renderer.domElement.removeEventListener('touchend', onPointerUp);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gyroEnabled, selectedVideo, isMuted]);

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

  const requestGyroPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setGyroEnabled(true);
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.error('Gyroscope permission denied', err);
        setHasPermission(false);
      }
    } else {
      setGyroEnabled(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
    }
    setIsPlaying(false);
    setSelectedVideo(null);
    setShowMenu(true);
    setShowHotspotInfo(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-screen h-screen bg-gray-50 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Main Menu */}
      {showMenu && !selectedVideo && (
        <div className="absolute inset-0 overflow-auto bg-white">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="max-w-6xl w-full">
              {/* Header */}
              {/* Brand Header */}
            <div className="text-center mb-12">
  <img
    src="/images/logo.png"
    alt="Tritorc Logo"
    className="mx-auto mb-4 w-40 md:w-56 animate-fade-in"
  />
  <p className="text-xl text-black">
    Experience Our Tools in Immersive VR
  </p>
</div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 px-4">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => selectVideo(video)}
                    className="bg-white rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group border-2 border-gray-200 hover:border-gray-400"
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300"></div>
                      <Play size={48} className="relative z-10 text-gray-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-4 sm:p-5 md:p-6 text-left">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                        <Info size={14} />
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

      {/* Video Player UI */}
      {selectedVideo && (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 sm:p-4 md:p-6 z-10">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <button
                onClick={backToMenu}
                className="bg-white/90 hover:bg-white text-gray-900 px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-all text-sm sm:text-base font-medium"
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              
              <div className="flex-1 text-white text-right">
                <h2 className="text-sm sm:text-lg md:text-xl font-bold truncate drop-shadow-lg">{selectedVideo.title}</h2>
                <p className="text-xs sm:text-sm text-gray-200 mt-1 drop-shadow">
                  {gyroEnabled ? 'Gyro Active' : 'Drag to Explore'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="absolute top-16 sm:top-20 md:top-24 left-0 right-0 px-3 sm:px-4 md:px-6 z-10">
            <div className="bg-white/20 backdrop-blur-sm rounded-full h-1 sm:h-1.5 overflow-hidden">
              <div 
                className="bg-gray-900 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white drop-shadow mt-1">
              <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 md:p-6 z-10">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={togglePlay}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full flex items-center gap-2 transition-all font-semibold text-sm sm:text-base"
              >
                {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5" />}
                <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={toggleMute}
                className="bg-white/90 hover:bg-white text-gray-900 p-2 sm:p-3 rounded-full transition-all"
              >
                {isMuted ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
              </button>
              
              {!gyroEnabled && (
                <button
                  onClick={requestGyroPermission}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 transition-all text-sm sm:text-base"
                >
                  <RotateCw size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Gyro</span>
                </button>
              )}
              
              <button
                onClick={toggleFullscreen}
                className="bg-white/90 hover:bg-white text-gray-900 p-2 sm:p-3 rounded-full transition-all"
              >
                {isFullscreen ? <Minimize size={18} className="sm:w-5 sm:h-5" /> : <Maximize size={18} className="sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {/* Hotspot Info Modal */}
          {showHotspotInfo && (
            <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowHotspotInfo(null)}
              />
              <div className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 max-w-md sm:max-w-lg mx-4 shadow-2xl">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div className="flex-1 pr-4">
                    <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-3">
                      <Info size={14} />
                      Feature Detail
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {showHotspotInfo.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowHotspotInfo(null)}
                    className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors flex-shrink-0"
                  >
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  {showHotspotInfo.description}
                </p>
                <button
                  onClick={() => setShowHotspotInfo(null)}
                  className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold transition-all text-sm sm:text-base"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Permission Modal */}
      {!hasPermission && selectedVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30 p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md text-center mx-4 shadow-2xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <RotateCw size={32} className="text-white sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">Enable Motion Sensors</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
              For the best VR experience, allow access to your device&apos;s motion sensors. 
              Move your phone naturally to look around the 360° environment.
            </p>
            <button
              onClick={requestGyroPermission}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold w-full mb-3 sm:mb-4 transition-all text-sm sm:text-base"
            >
              Enable Sensors
            </button>
            <button
              onClick={() => setHasPermission(true)}
              className="text-gray-500 hover:text-gray-700 text-sm sm:text-base transition-colors"
            >
              Continue without sensors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}