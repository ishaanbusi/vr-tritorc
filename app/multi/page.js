"use client";


import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, Maximize, RotateCw, ChevronLeft, Info, X, Volume2, VolumeX } from 'lucide-react';

export default function VRVideoViewer() {
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showHotspotInfo, setShowHotspotInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const sceneRef = useRef(null);
  const videoRef = useRef(null);
  const hotspotsRef = useRef([]);

  // Your exhibition videos - customize these
  const videos = [
    {
      id: 1,
      title: "Product Demo 1",
      description: "See our flagship tool in action",
      thumbnail: "https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Demo+1",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      hotspots: [
        { position: [250, 50, 0], title: "Key Feature", description: "High precision cutting" },
        { position: [-200, 0, 100], title: "Safety System", description: "Auto-stop mechanism" }
      ]
    },
    {
      id: 2,
      title: "Product Demo 2",
      description: "Advanced manufacturing process",
      thumbnail: "https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=Demo+2",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      hotspots: [
        { position: [200, 100, -50], title: "Innovation", description: "Patented technology" }
      ]
    },
    {
      id: 3,
      title: "Product Demo 3",
      description: "Customer testimonial showcase",
      thumbnail: "https://via.placeholder.com/300x200/DB2777/FFFFFF?text=Demo+3",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      hotspots: []
    }
  ];

  useEffect(() => {
    if (!containerRef.current || !selectedVideo) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = isMuted;
    video.playsInline = true;
    video.src = selectedVideo.url;
    videoRef.current = video;

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // Create sphere for 360 video
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ map: videoTexture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Create hotspots
    hotspotsRef.current = [];
    selectedVideo.hotspots.forEach((hotspot, index) => {
      const hotspotGeometry = new THREE.SphereGeometry(8, 16, 16);
      const hotspotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4F46E5,
        transparent: true,
        opacity: 0.8
      });
      const hotspotMesh = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
      hotspotMesh.position.set(...hotspot.position);
      hotspotMesh.userData = { index, ...hotspot };
      scene.add(hotspotMesh);
      hotspotsRef.current.push(hotspotMesh);

      // Add pulsing animation
      const ring = new THREE.RingGeometry(10, 12, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4F46E5, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ringMesh = new THREE.Mesh(ring, ringMaterial);
      ringMesh.position.copy(hotspotMesh.position);
      ringMesh.lookAt(camera.position);
      scene.add(ringMesh);
      hotspotMesh.userData.ring = ringMesh;
    });

    sceneRef.current = { scene, camera, renderer, video };

    // Mouse/Touch controls
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

    // Hotspot click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onHotspotClick = (e) => {
      const clientX = e.clientX || e.changedTouches[0].clientX;
      const clientY = e.clientY || e.changedTouches[0].clientY;
      
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;

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
    renderer.domElement.addEventListener('touchend', onPointerUp);

    // Gyroscope controls
    let alpha = 0, beta = 0, gamma = 0;
    
    const handleOrientation = (e) => {
      if (!gyroEnabled) return;
      alpha = e.alpha || 0;
      beta = e.beta || 0;
      gamma = e.gamma || 0;
    };

    window.addEventListener('deviceorientation', handleOrientation);

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      // Animate hotspots
      hotspotsRef.current.forEach((hotspot) => {
        const scale = 1 + Math.sin(time * 2) * 0.2;
        hotspot.scale.set(scale, scale, scale);
        if (hotspot.userData.ring) {
          hotspot.userData.ring.lookAt(camera.position);
          hotspot.userData.ring.scale.set(scale * 1.2, scale * 1.2, 1);
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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
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
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const selectVideo = (video) => {
    setSelectedVideo(video);
    setShowMenu(false);
    setIsPlaying(false);
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

  return (
    <div className="relative w-screen h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden">
      {/* Video Container */}
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Main Menu */}
      {showMenu && !selectedVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="max-w-6xl w-full mx-4">
            {/* Brand Header */}
            <div className="text-center mb-12">
  <img
    src="/images/logo.png"
    alt="Tritorc Logo"
    className="mx-auto mb-4 w-40 md:w-56 animate-fade-in"
  />
  <p className="text-xl text-blue-200">
    Experience Our Tools in Immersive VR
  </p>
</div>


            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => selectVideo(video)}
                  className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden hover:scale-105 hover:bg-white/20 transition-all duration-300 group"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-6xl font-bold">
                    {video.id}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-blue-200 text-sm">
                      {video.description}
                    </p>
                    <div className="mt-4 text-blue-400 text-sm flex items-center gap-2">
                      <Info size={16} />
                      {video.hotspots.length} Interactive Points
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Instructions */}
            <div className="mt-12 text-center text-white/70 text-sm">
              <p>Select a demo to begin your VR experience</p>
              <p className="mt-2">💡 Use VR headset or enable gyroscope for best experience</p>
            </div>
          </div>
        </div>
      )}

      {/* Video Player UI */}
      {selectedVideo && (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 z-10">
            <div className="flex items-center justify-between">
              <button
                onClick={backToMenu}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <ChevronLeft size={20} />
                Back to Menu
              </button>
              <div className="text-white text-right">
                <h2 className="text-xl font-bold">{selectedVideo.title}</h2>
                <p className="text-sm opacity-70">
                  {gyroEnabled ? '🎯 Gyroscope Active' : '🖱️ Drag to explore'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={togglePlay}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full flex items-center gap-2 transition-all font-semibold"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={toggleMute}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              {!gyroEnabled && (
                <button
                  onClick={requestGyroPermission}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all"
                >
                  <RotateCw size={20} />
                  Enable Gyro
                </button>
              )}
              
              <button
                onClick={toggleFullscreen}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
              >
                <Maximize size={20} />
              </button>
            </div>

            {selectedVideo.hotspots.length > 0 && (
              <div className="mt-4 text-center text-white/70 text-sm">
                💡 Click on glowing spheres to learn more about features
              </div>
            )}
          </div>

          {/* Hotspot Info Modal */}
          {showHotspotInfo && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md mx-4 shadow-2xl pointer-events-auto">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {showHotspotInfo.title}
                  </h3>
                  <button
                    onClick={() => setShowHotspotInfo(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {showHotspotInfo.description}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Permission Modal */}
      {!hasPermission && selectedVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center mx-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCw size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Enable Motion Sensors</h2>
            <p className="text-gray-600 mb-6">
              For the ultimate VR experience, allow access to your device&apos;s motion sensors. 
              Move your phone to look around naturally.
            </p>
            <button
              onClick={requestGyroPermission}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-semibold w-full"
            >
              Enable Sensors
            </button>
            <button
              onClick={() => setHasPermission(true)}
              className="text-gray-500 hover:text-gray-700 mt-4 text-sm"
            >
              Continue without sensors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}