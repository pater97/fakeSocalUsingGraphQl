//importo bcrypt per l'hasing della password
const bcrypt = require('bcryptjs');
//importo il model user per poter interagire con la collection
const User = require('../models/user');
const Post = require('../models/post');
//importo il validator
const validator = require('validator');
//importo jwt il generatore di token per l'auutenticaizone
const jwt = require('jsonwebtoken');
//imposto la funzione per l'eliminazione dell'immagine
const { clearImage } = require('../util/file');

module.exports = {
    //signup
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
    },
    //login
    login: async function({email,password}){
        //cerco l'utente che si vuole loggare
        const user = await User.findOne({email:email});
        //se l'utente non è trovato mando l'errore
        if(!user){
            const error = new Error('user not found');
            error.code = 401;
            throw error;
        }
        //se è stato trovato verifico la password
        const isEqual = await bcrypt.compare(password,user.password);
        if(!isEqual){
            const error = new Error('Password is incorrect');
            error.code = 401;
            throw error;
        }
        //genero il token
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        },'somesupersecretsecret',
        { expiresIn: '1h'});
        return { token: token,userId: user._id.toString()}
    },
    //creare post 
    createPost: async function({ postInput }, req) {
        //verifico se è autenticato
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        //creo array di errori
        const errors = [];
        //applico la validazione
        if (
          validator.isEmpty(postInput.title) ||
          !validator.isLength(postInput.title, { min: 5 })
        ) {
            //inserisco nell'array eventuali errori
          errors.push({ message: 'Title is invalid.' });
        }
        //valido
        if (
          validator.isEmpty(postInput.content) ||
          !validator.isLength(postInput.content, { min: 5 })
        ) {
            //pusho eventuali errori
          errors.push({ message: 'Content is invalid.' });
        }
        //se ci sono errori blocco e invio l'errore
        if (errors.length > 0) {
          const error = new Error('Invalid input.');
          error.data = errors;
          error.code = 422;
          throw error;
        }
        //estrapolo l'utente dall'a richiesta autenticata
        const user = await User.findById(req.userId);
        if (!user) {
          const error = new Error('Invalid user.');
          error.code = 401;
          throw error;
        }
        //creo il costrutto per il nuovo post
        const post = new Post({
          title: postInput.title,
          content: postInput.content,
          imageUrl: postInput.imageUrl,
          creator: user
        });
        //salvo il nuovo post
        const createdPost = await post.save();
        //pusho il nuovo post anche all'utente
        user.posts.push(createdPost);
        //salvo le modifiche dell'utente
        await user.save();
        //salvo il post ritornando ciò che lo schema si aspetta
        return {
          ...createdPost._doc,
          _id: createdPost._id.toString(),
          createdAt: createdPost.createdAt.toISOString(),
          updatedAt: createdPost.updatedAt.toISOString()
        };
      },
      //mostrare i post
      posts: async function({page}, req) {
        //verifico l'autentificazione
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        if(!page){
            page=1;
        }
        const perPage = 2;

        //conto i post totali
        const totalPosts = await Post.find().countDocuments();
        //trovo tutti i post
        const posts = await Post.find()
          .sort({ createdAt: -1 })
          //aggiungo paginazione
          .skip((page -1) * perPage)
          .limit(perPage)
          //prendo anche i dati dell'utente che ha creato il post
          .populate('creator');
        return {
            //mappo ogni singolo post
          posts: posts.map(p => {
            return {
                //spreddo per avere accesso a tutti gli specifici dati
              ...p._doc,
              _id: p._id.toString(),
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString()
            };
          }),
          totalPosts: totalPosts
        };
      },
      //vista show, passo il parametro dell'id
      post: async function({ id }, req) {
          //verifico l'autenticazione dell'utente
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        //cerco il post tramite id e popolo anche l'utente
        const post = await Post.findById(id).populate('creator');
        //se non trovo il post mando errore 
        if (!post) {
          const error = new Error('No post found!');
          error.code = 404;
          throw error;
        }
        //altimenti ritorno il post spreddato, id e date
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        };
      },
      //edit del post, passando id e nuovi dati
      updatePost: async function({ id, postInput }, req) {
          //verifico se è autenticato
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        //cerco il post tramite id e popolo l'utente creatore
        const post = await Post.findById(id).populate('creator');
        //se il post non è stato trovato mando errore
        if (!post) {
          const error = new Error('No post found!');
          error.code = 404;
          throw error;
        }
        //se l'ide del creatore non coincide con chi ha fatto richiesta blocco e mando err
        if (post.creator._id.toString() !== req.userId.toString()) {
          const error = new Error('Not authorized!');
          error.code = 403;
          throw error;
        }
        //creo un array per gli errori di validazione
        const errors = [];
        if (
          validator.isEmpty(postInput.title) ||
          !validator.isLength(postInput.title, { min: 5 })
        ) {
          errors.push({ message: 'Title is invalid.' });
        }
        if (
          validator.isEmpty(postInput.content) ||
          !validator.isLength(postInput.content, { min: 5 })
        ) {
          errors.push({ message: 'Content is invalid.' });
        }
        //se c'è qualche errore blocco tutto e mando l'err
        if (errors.length > 0) {
          const error = new Error('Invalid input.');
          error.data = errors;
          error.code = 422;
          throw error;
        }
        //estrapolo i valori degli input
        post.title = postInput.title;
        post.content = postInput.content;
        //se l'immagine non è stata modificata reinserisco quella precedente
        if (postInput.imageUrl !== 'undefined') {
          post.imageUrl = postInput.imageUrl;
        }
        //salvo il nuovo post
        const updatedPost = await post.save();
        //ritorno i dati richiesti dallo schema
        return {
          ...updatedPost._doc,
          _id: updatedPost._id.toString(),
          createdAt: updatedPost.createdAt.toISOString(),
          updatedAt: updatedPost.updatedAt.toISOString()
        };
      },
      //eliminazione del post passando l'id
      deletePost: async function({ id }, req) {
          //verifico se l'utente è autorizzato
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        //ricerco il post grazie all'id
        const post = await Post.findById(id);
        //verifico se c'è un riscontro nel db
        if (!post) {
          const error = new Error('No post found!');
          error.code = 404;
          throw error;
        }
        //verifico che sia lo stesso creatore a volerlo eliminare
        if (post.creator.toString() !== req.userId.toString()) {
          const error = new Error('Not authorized!');
          error.code = 403;
          throw error;
        }
        //elimino l'immagine dalla cartella image 
        clearImage(post.imageUrl);
        //rimuovo il post basandomi sull'id
        await Post.findByIdAndRemove(id);
        //cerco l'utente ed elimino dal sua array il post
        const user = await User.findById(req.userId);
        user.posts.pull(id);
        await user.save();
        return true;
      },
      user: async function(args, req) {
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
          const error = new Error('No user found!');
          error.code = 404;
          throw error;
        }
        return { ...user._doc, _id: user._id.toString() };
      },
      updateStatus: async function({ status }, req) {
        if (!req.isAuth) {
          const error = new Error('Not authenticated!');
          error.code = 401;
          throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
          const error = new Error('No user found!');
          error.code = 404;
          throw error;
        }
        user.status = status;
        await user.save();
        return { ...user._doc, _id: user._id.toString() };
      }
};

//potrebbe esserci args  come primo parametro e sta ad indicare gli arcomenti di UserInputData, quindi email/password