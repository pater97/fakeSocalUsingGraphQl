//importo bcrypt per l'hasing della password
const bcrypt = require('bcryptjs');
//importo il model user per poter interagire con la collection
const User = require('../models/user');
//importo il validator
const validator = require('validator');

module.exports = {
    createUser: async function({ userInput },req){
        //valido gli input
        //creo un array nel quale inserirò gli errori se presenti
        const errors = [];
        //valido attraverso il validator la mail e se ho errori li pusho nel mio array di errori
        if(!validator.isEmail(userInput.email)){
            errors.push({message:'E-mail is invalid!'})
        }
        //valido la password
        if(
            validator.isEmpty(userInput.password) ||
            !validator.isLength(userInput.password, {min:5})
        ){
            errors.push({message:'password too short!'})
        }
        //di conseguenza farò in base al mio array di errori, se pieno blocco altrimenti è a buon fine
        if(errors.length > 0){
            const error = new Error('invalid input');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        //verifico che non esista una mail uguale
        const existingUser = await User.findOne({email:userInput.email});
        if(existingUser){
            const error = new Error('User arleady exist');
            throw error;
        }
        //altrimenti procedo e hasho la password
        const hashedPw = await bcrypt.hash(userInput.password,12);
        //creo un costrutto
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashedPw
        });
        //salvo
        const createdUser = await user.save();
        //come da schema devo ritornare l'utente
        return {...createdUser._doc,_id: createdUser._id.toString() }
    }
};

//potrebbe esserci args  come primo parametro e sta ad indicare gli arcomenti di UserInputData, quindi email/password