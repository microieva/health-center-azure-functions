require('dotenv').config();
const { app, HttpResponse } = require('@azure/functions');
const sql = require('mssql');

app.http('httpTriggerDbConnection', {
    methods: ['GET', 'OPTIONS'],
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

        if (request.method === "OPTIONS") {
            let allowOrigin = isAllowedOrigin ? origin : null;
            if (!allowOrigin) {allowOrigin = '*'}
            return new HttpResponse(null, {
                status: 204,
                headers: {
                    "Content-Type": "text/plain",
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        try {
            let allowOrigin = isAllowedOrigin ? origin : null;
            if (!allowOrigin) {allowOrigin = '*'}
            await sql
                .connect(config)
                .then(async (pool) => {
                    try {
                        const result = await pool
                            .request()
                            .query('SELECT 1');
                        context.log(`Keep Alive Query result: ${result.recordset}`);
                        context.res = new HttpResponse({
                            status: 200,
                            headers: {
                                "Content-Type": "text/plain",
                                "Access-Control-Allow-Origin": allowOrigin,
                                "Access-Control-Allow-Methods": "GET, OPTIONS",
                                "Access-Control-Allow-Headers": "Content-Type"
                            },
                            body: 'Database ready'
                        });
                    } catch (error) {
                        context.log('Query error:', error);
                        context.res = new HttpResponse({
                            status: 500,
                            headers: {
                                "Content-Type": "text/plain",
                                "Access-Control-Allow-Origin": allowOrigin,
                                "Access-Control-Allow-Methods": "GET, OPTIONS",
                                "Access-Control-Allow-Headers": "Content-Type"
                            },
                            body: 'Error executing query: ' + error
                        });
                    }
                })
                .catch((error) => {
                    context.log('Connection error:', error);
                    context.res = new HttpResponse({
                        status: 500,
                        headers: {
                            "Content-Type": "text/plain",
                            "Access-Control-Allow-Origin": allowOrigin,
                            "Access-Control-Allow-Methods": "GET, OPTIONS",
                            "Access-Control-Allow-Headers": "Content-Type"
                        },
                        body: 'Error connecting to the database.'
                    });
                });    
        } catch (error) {
            context.log('Error:', error);
            context.res = new HttpResponse({
                status: 500,
                headers: {
                    "Content-Type": "text/plain",
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: 'An error occurred while trying to connect to the database: '+error
            });
        }
    }
});
