require('dotenv').config();
const { app, HttpResponse } = require('@azure/functions');
const sql = require('mssql');

app.http('httpTriggerDb', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

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

        const allowedOrigins = [
            'https://portal.azure.com', 
            'http://localhost:4200',
            'https://wonderful-dune-0e4733c03.5.azurestaticapps.net'
        ];

        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin);
        const allowOrigin = isAllowedOrigin ? origin : '*';

        if (request.method === "OPTIONS") {
            return new HttpResponse(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        try {
            const pool = await sql.connect(config);
            const result = await pool.request().query('SELECT 1');

            context.log(`Keep Alive Query result: ${JSON.stringify(result.recordset)}`);
            pool.close(); 

            return new HttpResponse('Database ready', {
                status: 200,
                headers: {
                    "Content-Type": "text/plain",
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });

        } catch (error) {
            context.log('Database connection/query error:', error);
            sql.close(); 

            return new HttpResponse('Error connecting to the database: ' + error.message, {
                status: 500,
                headers: {
                    "Content-Type": "text/plain",
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }
    }
});
