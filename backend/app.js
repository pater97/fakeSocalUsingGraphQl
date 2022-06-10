const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
//importo express-graphql per la gestione dei middleware
const { graphqlHTTP } = require('express-graphql');
//importo schema e risolutore per concretizzare le richieste
const graphQlSchema = require('./graphql/schema')
const graphQlResolvers = require('./graphql/resolvers')

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: function(req, file, cb) {
    cb(null, uuidv4())
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method === 'OPTIONS'){
    return res.sendStatus(200);
  }
  next();
});

//middleware che gestisce graphQl
app.use('/graphql',     //indico la rotta
  graphqlHTTP({         //la gestisco attraverso express-graphQl
    schema: graphQlSchema,  //utilizzo lo schema
    rootValue: graphQlResolvers, //il valore della risposta dato dal resolvers
    graphiql:true,         //è un tool che permette di avere un interfaccia grafica visitantdo l'url http://localhost:8080/graphql
    //gestione degli errori
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;                    //recupero dal resolvers gli errori
      const message = err.message || 'An error occurred.';
      const code = err.originalError.code || 500;               //prendo il codice passato dall'errore oppure imposto il 500
      return { message: message, status: code, data: data };    //passo all'errore gli errori specifici
    }
}))

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    'mongodb+srv://root:root@thecluster.1uaxy.mongodb.net/apirest?retryWrites=true&w=majority'
  )
  .then(result => {
    app.listen(8080);
    console.log('connesso!')
  })
  .catch(err => console.log(err));
