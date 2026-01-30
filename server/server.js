const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const {connectDB, Drawing,getLastDrawing,saveDrawing} = require('./db_ops');

const app = express();
connectDB();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));;



app.post('/save', async (req,res)=>{
    try{
        const savedDoc = await saveDrawing(req.body.image);
        
        res.status(200).json({ 
            success: true, 
            message: "Drawing saved!", 
            id: savedDoc._id 
        });
    }catch(err){
        res.status(500).json({success: false, message: `Server Error: ${err}`});
    }
});

app.get('/load', async (req,res) =>{
    try{
        const lastImage = await getLastDrawing();
        res.status(200).json({
            success: true,
            message: lastImage ? "Drawing retrieved!" : "Drawing not found",
            image: lastImage ? lastImage.data : null
        })
    }catch(err){
        res.status(500).json({success: false, message: `Server Error: ${err}`})
    }
})


app.listen(PORT, ()=>{
    console.log(`Server running on http://localhost:${PORT}`);
});