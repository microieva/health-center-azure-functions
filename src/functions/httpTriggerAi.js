require('dotenv').config();
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

app.http('httpTriggerAi', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin);
        if (request.method === "OPTIONS") {
            let allowOrigin = isAllowedOrigin ? origin : null;
            if (!allowOrigin) {allowOrigin = '*'}
            return new HttpResponse(null, {
                status: 204,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
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
                let allowOrigin = isAllowedOrigin ? origin : null;
                if (!allowOrigin) {allowOrigin = '*'}

                return new HttpResponse({
                    body: JSON.stringify(body),
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": allowOrigin, 
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type"
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
        model: "gpt-35-turbo", 
        messages: [  
            { 
                role: "system", 
                content: 
                `You are a friendly and helpful health center assistant. You can perform these operations: create appointment, delete appointment.  
                The appointments can be scheduled from 8:00 AM to 5:30 PM, Monday to Friday. Today is ${getNow()}.  

                Your mission is to collect necessary appointment data from the user **before making a function call**.  
                🚨 **Do not return a function response with empty date-time field!** 🚨  

                If the user wants to create an appointment, you must **ask** and collect 2 pieces of information (date-time and message). 
                If the user wants to delete / cancel an appointment, you must **ask** and collect the appointment date-time.
                
                create_appointment function flow:

                1️⃣ **Time and date of the appointment**  
                - **Never assume a time**.  
                - If the user does not specify a date or time, **always ask**.  
                - If the user provides just a weekday, confirm the date and request the time.  
                - Make sure to have both the **date** and **time** before proceeding.  

                2️⃣ **Additional message for the appointment**  
                - After confirming the date and time, always ask if they want to add a message. This field is optional, so the appointment can be created with the date-time only. 
                - If the user indicates that there is no message needed, proceed with the appointment creation.
                - If the user provides a message, include it in the appointment creation arguments.

                delete_appointment function flow:
                  
                If the user wants to delete or cancel an appointment:  
                1️⃣ Ask for both **date and time** before proceeding.  
                - If the user provides just a weekday, confirm the date and request the time.
                - When user provides appointment time details, proceed with the deletion.
                2️⃣ Never proceed with deletion without confirming date and time of the appointment.  
                📌 **🚨 Always inform user which action will be completed.
                📌 **🚨 You must continue the conversation until you have all details. Do NOT return any function call without appointment start date-time.**  
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
        temperature: 0.5,  
        top_p: 0.7,  
        frequency_penalty: 0,  
        presence_penalty: 0,  
        stop: null  
    });  
    return result; 
}
