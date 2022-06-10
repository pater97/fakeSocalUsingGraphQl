const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    input UserInputData {
        email: String!
        name: String!
        password: String!
    }

    type RootQuery {
        hello: String
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);


//type/schema/input sono tutte parole chiave di graphql


//esporto lo schema attraverso i backtick (alt+96)
// module.exports = buildSchema(` 
//     type TestData {
//         text: String!
//         views: Int!
//     }                    
//     type RootQuery {
//         hello : TestData!
//     }

//     schema {
//         query: RootQuery
//     }
// `)

//type rootquery inidca il nome dello schema 
//hello è la chiave e String il tipo cdi dato che tornerà indietro
//in schema richiamare il nome della quary