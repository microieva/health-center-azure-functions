const { app, HttpResponse } = require('@azure/functions');
const { AzureOpenAI } = require("openai"); 
const { DateTime } = require('luxon');

const openai = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT
});

const allowedOrigins = [
    'https://portal.azure.com', 
    'http://localhost:4200',
    'https://wonderful-dune-0e4733c03.5.azurestaticapps.net'
];

app.http('aiHttpTrigger', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin);
        if (request.method === "OPTIONS") {
            return new HttpResponse(null, {
                status: 204,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : '',
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, api-key"
                }
            });
        }
        try {
            const { message } = await request.json();
            if (!message) {
                return new HttpResponse('Please provide a message.', { status: 400 });
            }

            const aiResponse = await callOpenAI(message);
            if (aiResponse) {
                const response = {
                    content: aiResponse.choices[0].message.content,
                    role: aiResponse.choices[0].message.role,
                    tool_calls: aiResponse.choices[0].message.tool_calls,
                }
                const body = { response };

                return new HttpResponse({
                    body: JSON.stringify(body),
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : '', 
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, api-key"
                    },
                });

            }

        } catch (error) {
            context.log('Error:', error);
            return new HttpResponse('An error occurred while processing your request: '+error, { status: 500 });
        }
    }
});

function getNow() {
    return DateTime.now().setZone('Europe/Helsinki').toFormat('yyyy, MMM dd (ccc) HH:mm a');
}

async function callOpenAI(userMessage) {
    const result = await openai.chat.completions.create({  
        messages: [  
            { 
                role: "system", 
                content: `You are a friendly and helpful health center assistant. You can perform these operations: create appointment, delete appointment.
                    The appointments can be scheduled from 8:00 AM to 5:30 PM, Monday to Friday. Today is ${getNow()}.
                    Your mission is to collect necessary appointment data from the user. 
                    Maintain the conversation until you collect the necessary details from the user as follows:
                    create_appointment: if the user wants to create an appointment, ask for:
                    1) Time and date of the appointment:
                    - **Never assume a starting time.**
                    - If the user does not specify a time, **always ask**.
                    - if the user provides just a weekday, ask for the time, and confirm the date.
                    - Make sure to collect both, date and the hour of the appointment.
                    2) Additional message for the appointment: 
                    - once you have the date and time of the appointment, **always ask** the user if they want to include any extra message for the doctor in the appointment.    
                    
                    delete_appointment: if the user wants to delete an appointment, always make sure to ask for:
                    Proceed the conversation until you have obtained appointment date-time.
                    1) Ask the user to provide date and time explicitely, of the appointment to be deleted. 
                    - Make sure to request for both, date and the time (hour), of the appointment to be deleted. 
                    - Make sure to collect both, date and the hour of the appointment.
                    Return the structured data only once you have **all** necessary details as instructed.
                    `  
            },
            { 
                role: "user", 
                content: userMessage 
            }
        ],  
        tools: [
            {
                type: "function",
                function: {
                    name: "create_appointment",
                    description: "Collects appointment date & time and message from the user",
                    parameters: {
                        type: "object",
                        properties: {
                            start: { type: "string", format: "date-time", description: "ISO 8601 date-time of the appointment" },
                            patientMessage: { type: "string", description: "Additional message from the user" }
                        },
                        required: []
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "delete_appointment",
                    description: "Collects appointment date & time provided by the user",
                    parameters: {
                        type: "object",
                        properties: {
                            start: { type: "string", format: "date-time", description: "ISO 8601 date-time of the appointment to be deleted" },
                        },
                        required: []
                    }
                }
            }
            
        ],
        tool_choice: "auto",  
        max_tokens: 800,  
        temperature: 0.7,  
        top_p: 0.95,  
        frequency_penalty: 0,  
        presence_penalty: 0,  
        stop: null  
    });  
    return result; 
}
