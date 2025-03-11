import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({
    videoFile:{
        type:String, // cloudnary url
        required:true,
        unique:true
    },
    thumbnail:{
        type:String, // cloudnary url
        required:true,
    },
    title:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true,
    },
    duration:{
        type:String, // cloudnary url
        required:true
    },
    views:{
        type:Number,
        required:true,
        default:0,

    },
    isPublished:{
        type:Boolean,
        required:true,
        default:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema) 