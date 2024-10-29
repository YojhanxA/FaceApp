import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "./App.css"; // Importar archivo de estilos

const App = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [emotions, setEmotions] = useState({});
  const [savedFaceDescriptor, setSavedFaceDescriptor] = useState(null); // Para guardar el descriptor de la foto capturada

  // Cargar los modelos de face-api
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models"); // Modelo para detectar emociones
      startVideo();
    };
    loadModels();
  }, []);

  // Iniciar video
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("No se pudo iniciar el video:", err));
  };

  // Detectar rostros y emociones en tiempo real
  const handleVideoPlay = () => {
    setInterval(async () => {
      if (!canvasRef.current) return;

      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      faceapi.matchDimensions(canvasRef.current, displaySize);
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions(); // Detectar emociones

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Limpia y dibuja el canvas
      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);

      // Actualizar las emociones en el estado
      if (detections.length > 0) {
        setEmotions(detections[0].expressions); // Solo mostramos emociones de la primera cara detectada
      }
    }, 100);
  };

  // Función para capturar la foto y guardar el descriptor del rostro
  const capturePhoto = async () => {
    if (videoRef.current) {
      const detections = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        setSavedFaceDescriptor(detections.descriptor);
        alert("Foto capturada y características faciales guardadas.");
      } else {
        alert("No se detectó ningún rostro. Inténtalo de nuevo.");
      }
    }
  };

  // Función para comparar el rostro actual con el rostro guardado
  const compareFaces = async () => {
    if (videoRef.current && savedFaceDescriptor) {
      const detections = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        const distance = faceapi.euclideanDistance(
          savedFaceDescriptor,
          detections.descriptor
        );

        if (distance < 0.6) {
          // Umbral de similitud, mientras menor es más parecido
          alert("Rostro coincide con la foto guardada.");
        } else {
          alert("Rostro no coincide con la foto guardada.");
        }
      } else {
        alert("No se detectó ningún rostro para comparar.");
      }
    } else {
      alert("No hay ninguna foto guardada para comparar.");
    }
  };

  return (
    <div className="App">
      <h1>Reconocimiento Facial y Detección de Emociones</h1>
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoPlay}
        className="video"
      />
      <canvas ref={canvasRef} className="canvas" />

      {/* Botones para capturar foto y comparar rostro */}
      <button onClick={capturePhoto} className="capture-button">
        Capturar Foto
      </button>
      <button onClick={compareFaces} className="compare-button">
        Comparar Rostro
      </button>

      {/* Mostrar emociones detectadas (solo feliz, triste y enojado) */}
      <div className="emotions">
        <h2>Emociones Detectadas</h2>
        {emotions &&
          Object.entries(emotions)
            .filter(([emotion]) => ["happy", "sad", "angry"].includes(emotion)) // Filtrar solo happy, sad y angry
            .map(([emotion, value]) => (
              <p key={emotion} className="emotion">
                {emotion}: {(value * 100).toFixed(2)}%
              </p>
            ))}
      </div>
    </div>
  );
};

export default App;
