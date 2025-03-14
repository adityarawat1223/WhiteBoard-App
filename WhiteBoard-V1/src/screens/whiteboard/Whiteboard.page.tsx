"use client";
import React, { useEffect, useRef, useState } from "react";
import socket from "../../socket";
import { useParams } from "next/navigation"; // Extract params from URL
import SwatchColorPicker from "./SwatchColorPicker";
import CircleColorPicker from "./CircleColorPicker";
import { Typography, Button, Input } from "antd";

export const Whiteboard = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { sessionId } = useParams();
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [pencilType, setPencilType] = useState("normal");
  const [text, setText] = useState("");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);


  // Handle sending a message
  const sendMessage = () => {
    if (message.trim()) {
      console.log("Sending message:", message);  // Debug log

      socket.emit("sendMessage", { sessionId, message });
      setMessage(""); // Clear input field
    }
  };

  // useEffect(() => {
  //   socket.on("receiveMessage", (data) => {
  //     console.log("Received message:", data.message);  // Debug log

  //     setMessages((prevMessages) => [...prevMessages, data.message]);
  //   });

  //   return () => {
  //     socket.off("receiveMessage");
  //   };
  // }, []);
  const setDrawingStyles = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;

    if (pencilType === "blurred") {
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
    } else {
      ctx.shadowBlur = 0;
    }

    if (pencilType === "dotted") {
      ctx.setLineDash([10, 10]);
    } else {
      ctx.setLineDash([]);
    }
  };

  const [drawingHistory, setDrawingHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);



  const exportCanvas = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "whiteboard.png";
    link.click();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  useEffect(() => {
    if (!sessionId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Connect to the session
    socket.emit("joinSession", { sessionId });
    console.log(`Connected to session: ${sessionId}`);

    const handleMouseDown = (e: MouseEvent) => {
      setDrawing(true);
      context.beginPath();
      const xPercent = (e.clientX - canvas.offsetLeft) / canvas.width;
      const yPercent = (e.clientY - canvas.offsetTop) / canvas.height;
      context.moveTo(xPercent * canvas.width, yPercent * canvas.height);
      socket.emit("beginPath", { sessionId });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawing) return;
      const xPercent = (e.clientX - canvas.offsetLeft) / canvas.width;
      const yPercent = (e.clientY - canvas.offsetTop) / canvas.height;
      console.log(xPercent);
      setDrawingStyles(context);
      const x = xPercent * canvas.width;
      const y = yPercent * canvas.height;
      context.lineTo(x, y);
      context.stroke();

      socket.emit("draw", {
        sessionId,
        xPercent,
        yPercent,
        color,
        size: brushSize,
        type: pencilType,
      });
    };

    const handleMouseUp = () => {
      setDrawing(false);
      context.closePath();
      addToHistory(canvas);
    };

    const addToHistory = (canvas: HTMLCanvasElement) => {
      const dataUrl = canvas.toDataURL(); // Capture the current canvas state as a data URL (base64 image)
      setDrawingHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        newHistory.push(dataUrl);
        return newHistory;
      });
      setCurrentHistoryIndex((prevIndex) => prevIndex + 1);
    };

    socket.on("updateDrawingState", (data) => {
      const { historyIndex, state } = data;
      setCurrentHistoryIndex(historyIndex);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = state;

        // Update local drawing history
        setDrawingHistory((prev) => {
          const updatedHistory = [...prev];
          updatedHistory[historyIndex] = state;
          return updatedHistory;
        });
      }
    });

    socket.on("draw", (data) => {
      const { xPercent, yPercent, color, size } = data;
      setDrawingStyles(context);
      context.lineWidth = size;
      context.strokeStyle = color;
      const x = xPercent * canvas.width;
      const y = yPercent * canvas.height;
      context.lineTo(x, y);
      context.stroke();
    });

   

    socket.on("clear", () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("beginPath", () => {
      context.beginPath();
    });



    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      console.log("Cleanup called");

      socket.off("draw");
      socket.off("clear");
      socket.off("beginPath");
      socket.off("loadCanvas")
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drawing, color, brushSize, pencilType]);

  useEffect(() => {
    if (!sessionId) return; // Ensure sessionId is available

    const canvas = canvasRef.current;
    if (!canvas) return; // Ensure canvas element is present

    const context = canvas.getContext("2d");
    if (!context) return; // Ensure the canvas context is valid

    // Attach loadCanvas listener
    socket.on("loadCanvas", (data: Record<string, { xPercent: number; yPercent: number; color: string; size: number; type: string }>) => {
      console.log("Canvas loaded with data:", data);

      // Iterate over the received drawing actions and render them
      Object.values(data).forEach((action) => {
        const { xPercent, yPercent, color, size } = action;

        // Adjust drawing styles
        context.strokeStyle = color;
        context.lineWidth = size;

        // Compute actual canvas coordinates
        const x = xPercent * canvas.width;
        const y = yPercent * canvas.height;

        context.lineTo(x, y);
        context.stroke();
      });

      context.beginPath(); // Reset path after loading data
    });

    // Cleanup the listener on unmount or session change
    return () => {
      socket.off("loadCanvas"); // Remove only the loadCanvas listener
    };
  }, [sessionId]);

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const prevHistoryIndex = currentHistoryIndex - 1;
      const prevState = drawingHistory[prevHistoryIndex];
      setCurrentHistoryIndex(prevHistoryIndex);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = prevState;
      }

      socket.emit("undo", { sessionId, historyIndex: prevHistoryIndex, state: prevState });
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < drawingHistory.length - 1) {
      const nextHistoryIndex = currentHistoryIndex + 1;
      const nextState = drawingHistory[nextHistoryIndex];
      setCurrentHistoryIndex(nextHistoryIndex);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = nextState;
      }

      socket.emit("redo", { sessionId, historyIndex: nextHistoryIndex, state: nextState });
    }
  };
  const handleColorChange = (newColor: { hex: React.SetStateAction<string> }) => {
    setColor(newColor.hex);
  };

  const handleclear = () => {
    window.location.reload();
    socket.emit("clear", { sessionId });

  };
  const handleBrushSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(event.target.value));
  };

  const handlePencilTypeChange = (value: string) => {
    setPencilType(value);
  };

  const handleEraser = () => {
    setColor("#FFFFFF");
  };

  return (
    <div className="m-10">
      <Typography.Title>Whiteboard - Session: {sessionId}</Typography.Title>
      <div className="flex gap-x-20">
        <div className="flex flex-col gap-y-10">
          <div className="border border-slate-50 shadow-lg p-6 rounded-2xl">
            <SwatchColorPicker color={color} onColorChange={handleColorChange} />
          </div>
          <div className="border border-slate-50 shadow-lg p-6 rounded-2xl">
            <CircleColorPicker color={color} onColorChange={handleColorChange} />
          </div>
          <div>
            <Button onClick={handleUndo}>
              Undo
            </Button>
            <Button onClick={handleRedo}>
              Redo
            </Button>
            <Button onClick={() => exportCanvas(canvasRef.current!)} style={{ marginBottom: '10px' }}>
              Export
            </Button>
            <Button onClick={handleclear} style={{ marginBottom: '10px' }}>
              Clear All
            </Button>
          </div>
          <Input
            placeholder="Enter text here"
            value={text}
            onChange={handleTextChange}
            onPressEnter={(e) => {
              const ctx = canvasRef.current?.getContext("2d");
              if (ctx) {
                ctx.font = "30px Arial";
                ctx.fillText(text, 50, 50);
              }
            }}
          />
        </div>
        <div>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{ border: "1px solid gray", borderRadius: "50px" }}
          />
        </div>
        <div className="absolute right-5">
          <div className="border border-slate-50 shadow-lg p-6 rounded-2xl">
            <Typography.Title level={5} className="!text-gray-500 !font-normal !mb-4">
              Brush Size
            </Typography.Title>
            <div className="flex gap-x-10">
              <input
                id="brushSize"
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={handleBrushSizeChange}
                style={{
                  appearance: "none",
                  width: "50px",
                  height: "6px",
                  background: "#4db6ac",
                  outline: "none",
                  opacity: 0.7,
                  borderRadius: "5px",
                  transition: "opacity 0.2s",
                }}
              />
              <span className="text-teal-800 mt-[-8px]">{brushSize}px</span>
            </div>
          </div>

          <div className="border border-slate-50 shadow-lg p-6 rounded-2xl mt-10">
            <Typography.Title level={5} className="!text-gray-500 !font-normal !mb-4">
              Pencil Type
            </Typography.Title>
            <select
              value={pencilType}
              onChange={(e) => handlePencilTypeChange(e.target.value)}
              className="border border-[#009688] focus:ring-[#009688] focus:outline-none text-gray-700 text-sm rounded-lg"
            >
              <option value="normal">Normal</option>
              <option value="blurred">Blurred</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          <div className="mt-10">
            <Button onClick={handleEraser}>Eraser</Button>
          </div>
        </div>
      </div>
      {/* <div>
        <div className="border border-slate-50 shadow-lg p-6 rounded-2xl">
          <div className="h-60 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className="p-2">
                <Typography.Text>{msg}</Typography.Text>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow p-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={sendMessage}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      </div> */}

    </div>
  );
};
