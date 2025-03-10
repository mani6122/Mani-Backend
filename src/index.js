// require('dotenv').config({path: './.env'});

import dotenv from 'dotenv';    


// import mongoose from 'mongoose';
// import { DB_NAME } from './constants';
import connectDB from './db/index.js'; 
import app from './app.js';

/*
import express from 'express';
const app = express();

;(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("ERROR", (error)=>{
            console.log(error," : ERROR");
            throw error;
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error(error," : ERROR")
    }
})()
    */
dotenv.config({path: './.env'});
connectDB()
.then(()=>{
    app.on("ERROR_OCCURED ", (error)=>{
        console.log(error," : ERROR");
        throw error;
    })
    app.listen(process.env.PORT||8000, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.error("MongoDB connection failed !!! ",error);
})