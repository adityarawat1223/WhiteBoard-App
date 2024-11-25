import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const Canvas = forwardRef(({ tool, color, thickness }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentRect = useRef(null); // Stores the current rectangle being drawn
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const textToAdd = useRef(null);

  useImperativeHandle(ref, () => ({
    clearCanvas: () => clearCanvas(),
    undo: () => undo(),
    redo: () => redo(),
    setText: (text) => setText(text),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    saveState(); // Save initial state
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    undoStack.current.push(canvas.toDataURL()); // Save current canvas state
    if (undoStack.current.length > 20) undoStack.current.shift(); // Limit stack size
    redoStack.current.length = 0; // Clear redoStack on new action
  };

  const restoreState = (stack) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (stack.length === 0) return;
    const imageURL = stack[stack.length - 1];
    const img = new Image();
    img.src = imageURL;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (undoStack.current.length > 1) {
      redoStack.current.push(undoStack.current.pop()); // Move the current state to redoStack
      const imageURL = undoStack.current[undoStack.current.length - 1];
      const img = new Image();
      img.src = imageURL;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (redoStack.current.length > 0) {
      const imageURL = redoStack.current.pop();
      undoStack.current.push(imageURL); // Push the redone state back to undoStack
      const img = new Image();
      img.src = imageURL;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const setText = (text) => {
    textToAdd.current = text;
  };

  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === 'text' && textToAdd.current) {
      addText(textToAdd.current, offsetX, offsetY);
      textToAdd.current = null;
    } else if (tool === 'rect') {
      isDrawingRef.current = true;
      startPos.current = { x: offsetX, y: offsetY };
      currentRect.current = { x: offsetX, y: offsetY, width: 0, height: 0 };
    } else {
      isDrawingRef.current = true;
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
  };

  const handleMouseMove = (e) => {
    e.preventDefault();

    if (!isDrawingRef.current) return;

    const ctx = ctxRef.current;
    const { offsetX, offsetY } = e.nativeEvent;
    // const { x, y } = startPos.current;

    ctx.lineWidth = thickness;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'; // Erase mode
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; // Restore to draw mode
    } else if (tool === 'rect' && currentRect.current) {

      // Save the current canvas state before drawing the rectangle
      restoreState(undoStack.current); // Restore previous drawings

      // Update rectangle width and height
      currentRect.current.width = offsetX - currentRect.current.x;
      currentRect.current.height = offsetY - currentRect.current.y;

      // Redraw the entire canvas before drawing the rectangle
      // ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw previous elements (pen, eraser, text) after clearing the rectangle area
      // restoreState(undoStack.current);

      // Draw the current rectangle
      ctx.strokeStyle = color;
      ctx.strokeRect(
        currentRect.current.x,
        currentRect.current.y,
        currentRect.current.width,
        currentRect.current.height
      );
    }
  };

  const handleMouseUp = () => {
    if (tool === 'rect' && currentRect.current) {
      // Finalize the rectangle on mouse up
      const ctx = ctxRef.current;
      const { width, height } = currentRect.current;
      ctx.strokeStyle = color;
      ctx.strokeRect(currentRect.current.x, currentRect.current.y, width, height);
      saveState();
      currentRect.current = null; // Clear current rectangle reference
    }

    if (tool !== 'text') {
      isDrawingRef.current = false;
      ctxRef.current.closePath();
      saveState();
    }
  };

  const addText = (text, x, y) => {
    const ctx = ctxRef.current;
    ctx.font = `${thickness * 5}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    saveState();
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ border: '1px solid black' }}
    />
  );
});

export default Canvas;
