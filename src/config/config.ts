import dotenv from 'dotenv';

dotenv.config();

const SERVER_HOSTNAME = process.env.SERVER_HOSTNAME || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const SERVER_ACCEPTED_ORIGINS = process.env.SERVER_ACCEPTED_ORIGINS?.split(',');

const SERVER = {
    hostname: SERVER_HOSTNAME,
    port: SERVER_PORT,
    acceptedOrigins: SERVER_ACCEPTED_ORIGINS
};

const MONGO_URL = process.env.MDB_CONNECT || 'url';

const HTTP_LOGGING = process.env.HTTP_LOGGING || 'true';

const JWT_SECRET = process.env.JWT_SECRET || 'secretpass';

const config = {
    server: SERVER,
    mongoUrl: MONGO_URL,
    httpLogging: HTTP_LOGGING,
    jwtSecret: JWT_SECRET
};

export default config;
