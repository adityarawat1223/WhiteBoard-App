import React from 'react';

function ToolPanel({
  tool,
  setTool,
  color,
  setColor,
  thickness,
  setThickness,
  textInput,
  setTextInput,
  addText,
  clearCanvas,
  undo,
  redo,
}) {
  return (
    <div className="tool-panel">
      <button onClick={() => setTool('pen')}>Pen</button>
      <button onClick={() => setTool('eraser')}>Eraser</button>
      <input 
        type="color" 
        value={color} 
        onChange={(e) => setColor(e.target.value)} 
      />
      <label>
        Thickness:
        <input 
          type="range" 
          min="1" 
          max="20" 
          value={thickness} 
          onChange={(e) => setThickness(e.target.value)} 
        />
      </label>
      <button onClick={() => setTool('rect')}>Rectangle</button>
      <input 
        type="text" 
        value={textInput} 
        onChange={(e) => setTextInput(e.target.value)} 
        placeholder="Enter text" 
      />
      <button onClick={addText}>Add Text</button>
      <button onClick={clearCanvas}>Clear</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}

export default ToolPanel;
