const { app } = require('@azure/functions');
const sql = require('mssql');

app.timer('timerTriggerKeepAlive', {
    schedule: '0 0 9-17/1 * * 1-5',
    handler: async (myTimer, context) => {
        context.log('Timer function processed request');

        const config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: true, 
                enableArithAbort: true
            }
        };

        try {
            let pool = await sql.connect(config);
            let result = await pool.request().query('SELECT 1');
            context.log(`Keep Alive Query result: ${result.recordset}`);
            sql.close();
        } catch (err) {
            context.log('Error running query:', err);
            sql.close();
        }
    }
});
