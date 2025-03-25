import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({

    subscriber:{
        type:Schema.Types.ObjectId, // who is subscribing
        ref:"User",
        required:true

    },
    channel:{
        type:Schema.Types.ObjectId, // to which channel is subscribed
        ref:"User",
    }
     
},{timestamps:true});

export const Subscription = mongoose.model("Subscription",subscriptionSchema)