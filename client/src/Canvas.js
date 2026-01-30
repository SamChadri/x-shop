import {useRef, useEffect,useState} from 'react'

const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, a: 255 }; // We add Alpha (255 = solid)
};

export default function Canvas(props){
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const prevX = useRef(0);
    const prevY = useRef(0);
    const ctxRef = useRef(null)

    const [undostack, setUndoStack] = useState([]);
    const [redostack, setRedoStack] = useState([]);

    const [tool, setTool] = useState('brush');

    const [brushType, setBrushType] = useState('marker')

    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(5);

    const saveDrawing = async() =>{
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL();

        try{
            const response = await fetch('http://localhost:5000/save',{
                method: 'POST',
                headers:{ 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl}),
            });
            const result = await response.json();
            if(response.ok){ 
                alert("Drawing saved to server!")
            }else{
                alert("Save Failed: " + result.message);
            }
        }catch(error){
            console.error("Error saving drawing:", error);
            alert("Could not connect to the server.");  
        }

    };

    const restoreCanvas = (dataUrl) =>{
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!ctx || !canvas) return;

        if (!dataUrl) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        const img = new Image();
        img.src = dataUrl
        img.onload = () => {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(img,0,0);
        };
    };

    const getPixelColor = (imgData, x, y, width) => {
        const i = (y * width + x) * 4
        return {
            r: imgData[i],
            g: imgData[i+1],
            b: imgData[i+2],
            a: imgData[i+3]
        }
    }
    const colorsMatch = (color1,color2) =>{
        if(color1.r == color2.r && color1.g == color2.g && color1.b == color2.b && color1.a == color2.a){
            return true;
        }else{
            return false;
        }
    }

    const setPixelColor = (imgData, x, y, width, color) =>{
        const i = (y * width + x) * 4;
        imgData[i] = color.r;
        imgData[i + 1] = color.g
        imgData[i + 2] = color.b
        imgData[i + 3] = color.a
    }

    const floodFill = (startX, startY, fillColorHex) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        const width = canvas.width;
        const height = canvas.height;

        const imgData = ctx.getImageData(0,0,width,height);
        const pixels = imgData.data;

        const fillRGB = hexToRgb(fillColorHex);
        const targetColor = getPixelColor(pixels, startX, startY,width);

        if(colorsMatch(fillRGB,targetColor)){return}

        const queue = [[startX,startY]]

        while(queue.length > 0){
            const [x,y] = queue.shift();

            if(x < 0 || x >= width || y < 0 || y >= height){continue}
            const currentColor = getPixelColor(pixels, x, y, width);
            if(colorsMatch(targetColor,currentColor)){
                setPixelColor(pixels, x, y, width, fillRGB);

                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
        }

        ctx.putImageData(imgData, 0, 0);

        setUndoStack(prev => [...prev, canvas.toDataURL()]);
    }

    const undoAction = ()=>{
        if (undostack.length == 0) return;
        const currentView = undostack[undostack.length - 1];
        setRedoStack(prev => [...prev, currentView]);
        const newUndoStack = undostack.slice(0,-1);
        setUndoStack(newUndoStack);
        const prevState = newUndoStack.length > 0 ? newUndoStack[newUndoStack.length - 1] : null
        restoreCanvas(prevState);
    }

    const redoAction = ()=>{
        if (redostack.length == 0) return;
        const nextView = redostack[redostack.length - 1];
        setUndoStack(prev => [...prev, nextView]);
        const newRedoStack = redostack.slice(0,-1);
        setRedoStack(newRedoStack);

        restoreCanvas(nextView);
    }
    const brushButtonStyle = (type) => ({
        padding: '10px',
        backgroundColor: brushType === type ? '#e0e0e0' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
    });

    useEffect(() => {
        const loadLastDrawing = async () => {
            try {
                const response = await fetch('http://localhost:5000/load');
                const data = await response.json();

                if (data.image) {
                    restoreCanvas(data.image);
                    setUndoStack([data.image]);
                }
            } catch (err) {
                console.error("Initial load failed:", err);
            }
        };
        loadLastDrawing();
    }, []);



    useEffect(()=>{
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctxRef.current = ctx;

        canvas.width = 800
        canvas.height = 800

        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round'


        const startDrawing = (e)=>{
            if(tool == 'bucket'){
                const rect = canvasRef.current.getBoundingClientRect();
                const x = Math.floor(e.clientX - rect.left);
                const y = Math.floor(e.clientY - rect.top);
                floodFill(x, y, color);
                return;
            }
            isDrawing.current = true
            const rect = canvas.getBoundingClientRect()
            prevX.current = e.clientX - rect.left
            prevY.current = e.clientY - rect.top

        }
        const stopDrawing = ()=>{
            isDrawing.current = false;
            ctx.beginPath();
            const data = canvas.toDataURL();
            setUndoStack(prev => [...prev, data]);
            setRedoStack([]);
        };


        const draw = (e) =>{
            if(!isDrawing.current) return
            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = size;
            ctx.strokeStyle = color;

            ctx.beginPath()
            ctx.moveTo(prevX.current,prevY.current)

            ctx.lineTo(x,y)

            prevX.current = x
            prevY.current = y

            if(brushType === 'marker'){
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;

            }else if(brushType === 'pen'){
                ctx.globalAlpha = 0.4;
                ctx.shadowBlur = 0;
            }else if(brushType === 'airbrush'){
                ctx.globalAlpha = 0.1; // Very soft
                ctx.shadowBlur = size / 2;
                ctx.shadowColor = color;
            }

            ctx.stroke()



        };

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup',stopDrawing);
        canvas.addEventListener('mousemove',draw);

        return() =>{
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove',draw);
            canvas.removeEventListener('mouseup',stopDrawing)
        }
    },[color, size,brushType,tool]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', backgroundColor: '#f0f0f0',width: '100vw', height: '100vh' }}>
            <div style={{display: 'flex',flexDirection: 'row', gap: '5px'}}>
                    <button onClick={undoAction} disabled={undostack.length === 0}>
                        Undo
                    </button>
                    
                    <button onClick={redoAction} disabled={redostack.length === 0}>
                        Redo
                    </button>

                    <button 
                        onClick={saveDrawing} 
                        style={{ backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' }}
                    >
                        💾 Save Drawing
                    </button>
                </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <div style={{  display: 'flex', height: '100vh', }}>
                    <div className="toolbar" style={{ marginBottom: '10px', display: 'flex', gap: '20px', flexDirection: 'column',backgroundColor: '#ffffff',borderRight: '1px solid #ddd',boxShadow: '2px 0 5px rgba(0,0,0,0.05)',zIndex: 10 }}>
                        <input 
                            type="color" 
                            value={color} 
                            onChange={(e) => setColor(e.target.value)} 
                        />
                        <button 
                                style={{ backgroundColor: tool === 'bucket' ? '#e0e0e0' : 'transparent' }}
                                onClick={() => setTool('bucket')}
                            >
                                🪣 Bucket
                        </button>
                        <button 
                            style={{ backgroundColor: tool === 'brush' ? '#e0e0e0' : 'transparent' }}
                            onClick={() => setTool('brush')}
                        >
                            🖌️ Brush
                        </button>
                        <button 
                            style={brushButtonStyle('marker')} 
                            onClick={() => setBrushType('marker')}
                        >
                            🖍️ Marker
                        </button>
                        <button 
                            style={brushButtonStyle('pen')} 
                            onClick={() => setBrushType('pen')}
                        >
                            🖋️ Pen
                        </button>
                        <button 
                            style={brushButtonStyle('airbrush')} 
                            onClick={() => setBrushType('airbrush')}
                        >
                            ☁️ Airbrush
                        </button>
                        <div style={{ borderTop: '1px solid #eee', width: '100%' }} />
                    </div>
                </div>

                {/* CANVAS */}
                <div style={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    overflow: 'hidden' 
                }}>
                    <div style={{ 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                        backgroundColor: 'white',
                        lineHeight: 0 // Removes tiny gap at bottom of canvas
                    }}>
                        <canvas ref={canvasRef} />
                    </div>
                </div>
                <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                    <input type="range" min="1" max="50" value={size} onChange={(e) => setSize(e.target.value)} />
                    <span style={{ marginLeft: '10px' }}>Size: {size}</span>
                </div>
            </div>
        </div>

    );
    
}