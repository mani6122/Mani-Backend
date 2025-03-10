import e from "express";

const asyncHandler = (requestHandler)=>{
    return async (req, res, next)=>{
        Promise.resolve(requestHandler(req,res,next)).reject((error)=>next(error))
    }

}


export default asyncHandler;    


// const asyncHandler =(fn)=> async (req,res,next)=>{ 
//     try {
//         await fn(req,res,next)
//     }
//     catch (error) {
//         res.status(error.code||500).json({
//             success: false,
//             message: error.message||"Internal Server Error"
//         })
//     }
// }