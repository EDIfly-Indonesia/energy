require('dotenv').config({ path: './.env' });
module.exports = {
    multipleStatements  : true,
    host                : process.env.DB_HOST,
    user                : process.env.DB_USER,
    password            : process.env.DB_PASSWORD,
    database            : process.env.DB_DATABASE,
	keepAliveInitialDelay: 10000, // 0 by default.
    enableKeepAlive: true,
//    port                : process.env.DB_PORT
};
