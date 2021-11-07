# Social Media App API

## Table of Contents
+ [About](#about)
+ [Getting Started](#getting_started)
+ [Built Using](#built_using)

## About <a name = "about"></a>
This is an API for a social media app.

## Getting Started <a name = "getting_started"></a>
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

What things you need to install the software and how to install them.

```
npm install
```

### Configuration

1. Create your own `.env` file
2. Paste this template to the file

    ```shell    
    SERVER_HOSTNAME = localhost
    SERVER_PORT = 3000
    SERVER_ACCEPTED_ORIGINS = "urls_seperated_with_commas"


    MDB_CONNECT = mongodb_srv_link

    HTTP_LOGGING = true

    JWT_SECRET = completely_random_characters
    ```
3. Change the variable values and you're done!

### Running the app

```
npm start
```

## Built Using <a name = "built_using"></a>
- [NodeJS](https://nodejs.org/en/) - Server Environment
- [Express](https://expressjs.com/) - Server Framework
- [MongoDB](https://www.mongodb.com/) - Database
