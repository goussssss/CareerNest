const { createHmac,randomBytes } = require('node:crypto');
const { createTokenForUser,validateToken } = require('../services/authentication');

const { Schema,model } = require("mongoose");


const UserSchema = new Schema({
    fullName: {
        type:String,
        required:true,
    },
    email: {
        type:String,
        required:true,
        unique:true,
    },
    salt: {
        type:String,
    },
    password: {
        type:String,
        required:true,
    },
    profileImageURL: {
        type:String,
        default: "/images/default.png", 
    },
    role: {
        type: String,
        enum: ["USER" , "ADMIN"],
        default: "USER",
    }
},{ timestamps : true});

UserSchema.pre("save", function (next){
    const user = this;

    if(!user.isModified("password")) return;

    const salt = randomBytes(16).toString();
    const hashedPassord = createHmac('sha256',salt).update(user.password).digest("hex"); 

    this.salt=salt;
    this.password=hashedPassord; 
    next();
});

UserSchema.static("matchPasswordAndGenerateToken", async function(email,password){
    const user = await this.findOne({ email });
    if(!user) throw new Error('User not found!');
    
    const salt = user.salt;
    const hashedPassord = user.password;

    const userProvidedHash = createHmac('sha256',salt).update(password).digest("hex");

    if(hashedPassord !== userProvidedHash) throw new Error('Incorrect Password');
    
    const token = createTokenForUser(user);
    return token;
});

const User = model("user",UserSchema);

module.exports = User;