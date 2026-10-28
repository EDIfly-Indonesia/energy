require('dotenv').config({ path: './.env' });
module.exports = {
    multipleStatements  : true,
    host                : process.env.DB_HOST_POSTGRE,
    user                : process.env.DB_USER_POSTGRE,
    password            : process.env.DB_PASSWORD_POSTGRE,
    database            : process.env.DB_DATABASE_POSTGRE,
    port                : process.env.DB_PORT_POSTGRE
};