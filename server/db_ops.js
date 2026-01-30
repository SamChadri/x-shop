const mongoose = require('mongoose');

const connectDB = async() =>{
    try{
        const conn = await mongoose.connect('mongodb://db:27017/drawing_app');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }catch(error){
        console.error(`Connection Error: ${error.message}`);
        process.exit(1);
    }
}

const drawingSchema = new mongoose.Schema({
    name: {type: String, default: "Untitled Drawing"},
    data: {type: String, required: true},
    createdAt: {type: Date, default: Date.now}
});

const Drawing = mongoose.model('Drawing', drawingSchema);

async function saveDrawing(image){
    try{
        const newDrawing = new Drawing({ data: image});
        return await newDrawing.save()
    }catch(err){
        console.error("DB Save Error:", err);
        throw err
    }
}

async function getLastDrawing(){
    try{
        return await Drawing.findOne().sort({createdAt: -1})
    }catch(err){
        console.error("DB Read Error:", err);
        throw err
    }
}

module.exports = {connectDB, Drawing, getLastDrawing,saveDrawing}