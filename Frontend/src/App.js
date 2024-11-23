import React, { useState, useRef } from 'react';
import ToolPanel from './components/ToolPanel';
import Canvas from './components/Canvas';
import './App.css';

function App() {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(2);
  const [textInput, setTextInput] = useState('');
  const canvasRef = useRef(null);

  const handleAddText = () => {
    if (canvasRef.current && textInput.trim() !== '') {
      setTool('text');
      canvasRef.current.setText(textInput);
    }
  };

  return (
    <div className="App">
      <ToolPanel 
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        thickness={thickness}
        setThickness={setThickness}
        textInput={textInput}
        setTextInput={setTextInput}
        addText={handleAddText}
        clearCanvas={() => canvasRef.current.clearCanvas()}
        undo={() => canvasRef.current.undo()}
        redo={() => canvasRef.current.redo()}
      />
      <Canvas 
        tool={tool}
        color={color}
        thickness={thickness}
        ref={canvasRef}
      />
    </div>
  );
}

export default App;
