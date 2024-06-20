import proto from './protoloader/index.js';
import grpc from '@grpc/grpc-js'
import User from './model/User.js';
import './database/connection.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const register = async (call, callback) => {
    const { username, name, email, password } = call.request;
    const usernameExists = await User.findOne({username: username}).exec();
    if(usernameExists){
        return callback(null, {});
    }
    const nameExists = await User.findOne({name: name}).exec();
    if(nameExists){
        return callback(null, {});
    }
    const emailExists = await User.findOne({email: email}).exec();
    if(emailExists){
        return callback(null, {});
    }

    const refresh_token = jwt.sign({username, name, email}, process.env.REFRESH_TOKEN_SECRET_KEY);
    const access_token = jwt.sign({username, name, email}, process.env.ACCESS_TOKEN_SECRET_KEY, {'expiresIn': '30m'});
    await User.create({
        username: username,
        name: name,
        email: email,
        password: bcrypt.hashSync(password, 10),
        refresh_token: refresh_token,
    });
    return callback(null, {refresh_token: refresh_token, access_token: access_token});
}

const login = async (call, callback) => {
    const { username, password } = call.request;
    const user = await User.findOne({username: username});
    if(user){
        const isMatch = bcrypt.compareSync(password, user.password);

        if(isMatch){
            const refresh_token = jwt.sign({username: user.username, name: user.name, email: user.email}, process.env.REFRESH_TOKEN_SECRET_KEY);
            const access_token = jwt.sign({username: user.username, name: user.name, email: user.email}, process.env.ACCESS_TOKEN_SECRET_KEY, {'expiresIn': '30m'});
            return callback(null, {refresh_token: refresh_token, access_token: access_token});
        } else {
            return callback(null, {});
        }
    } else {s
        return callback(null, {});
    }
}

const setUserData = async (call, callback) => {
    const { user_id, address, bank_account } = call.request;
    const user = await User.findOneAndUpdate({id: user_id, $set: {address: address, bank_account: bank_account}});

    return callback(null, {
        address: address,
        bank_account: bank_account
    });
    
}

const getUserData = async (call, callback) => {
    const { user_id } = call.request;
    const user = await User.findOne({id: user_id});
    if(!user){
        return callback(null, {});
    }
    return callback(null, {
        address: user.address,
        bank_account: user.bank_account
    });
}

const generateAccessToken = (call, callback) => {
    jwt.verify(call.request.refresh_token, process.env.REFRESH_TOKEN_SECRET_KEY, (err, user) => {
        if(err) return callback(null, {});
        user.iat = Date.now();
        const access_token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET_KEY, {'expiresIn': '30m'});
        return callback(null, {access_token: access_token});
    });
}

const verifyToken = (call, callback) => {
    jwt.verify(call.request.access_token, process.env.ACCESS_TOKEN_SECRET_KEY, (err, user) => {
        if(err) return callback(null, {isVerified: false});
        return callback(null, {isVerified: true});
    });
}

proto.server.addService(proto.user.service, {
    Register: register,
    Login: login,
    SetUserData: setUserData,
    GetUserData: getUserData,
    GenerateAccessToken: generateAccessToken,
    VerifyToken: verifyToken
});


proto.server.bindAsync(`${process.env.URL}:${process.env.PORT}`, grpc.ServerCredentials.createInsecure(),
(e, port) => {
    if(e){
        console.log(e)
        
    }
    console.log(`User Service Running at grpc://${process.env.URL}:${process.env.PORT}`);
    
})