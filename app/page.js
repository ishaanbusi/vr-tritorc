"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, Maximize, RotateCw } from 'lucide-react';

export default function VRVideoViewer() {
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const sceneRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
    video.muted = true;
    video.playsInline = true;
    
    // Sample 360 video - replace with your video URL
    video.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    videoRef.current = video;

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // Create sphere for 360 video
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert sphere to see inside

    const material = new THREE.MeshBasicMaterial({ map: videoTexture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

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

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerUp);
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
    const animate = () => {
      requestAnimationFrame(animate);

      if (gyroEnabled && alpha !== 0) {
        // Use gyroscope data
        const alphaRad = THREE.MathUtils.degToRad(alpha);
        const betaRad = THREE.MathUtils.degToRad(beta);
        const gammaRad = THREE.MathUtils.degToRad(gamma);

        camera.rotation.order = 'YXZ';
        camera.rotation.y = alphaRad;
        camera.rotation.x = betaRad - Math.PI / 2;
        camera.rotation.z = -gammaRad;
      } else {
        // Use mouse/touch controls
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

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('deviceorientation', handleOrientation);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mouseup', onPointerUp);
      renderer.domElement.removeEventListener('touchstart', onPointerDown);
      renderer.domElement.removeEventListener('touchmove', onPointerMove);
      renderer.domElement.removeEventListener('touchend', onPointerUp);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gyroEnabled]);

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
      // For non-iOS devices, gyroscope works without permission
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

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Info Banner */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Exhibition VR Experience</h1>
        <p className="text-sm opacity-80">
          {gyroEnabled ? '🎯 Gyroscope Active - Move your device' : '🖱️ Drag to look around'}
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={togglePlay}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          {!gyroEnabled && (
            <button
              onClick={requestGyroPermission}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2 transition-all"
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
      </div>

      {/* Instructions */}
      {!hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Enable Motion Sensors</h2>
            <p className="text-gray-600 mb-6">
              For the best VR experience, allow access to your device&apos;s motion sensors. 
              This lets you look around by moving your phone.
            </p>
            <button
              onClick={requestGyroPermission}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-semibold"
            >
              Enable Sensors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}