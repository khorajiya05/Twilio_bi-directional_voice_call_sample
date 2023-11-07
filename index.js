/**
 * WebSocket and HTML Server for Twilio Phone Control
 * 
 * This server sets up a WebSocket connection and serves HTML files for controlling a Twilio phone system.
 * It handles WebSocket communication between the admin panel and the phone overlay, enabling control over phone calls.
 * 
 * @module Express
 * @module ws
 * @module twilio
 * @module VoiceResponse
 * 
 * @requires dotenv
 * @requires express
 * @requires ws
 * @requires twilio
 * @requires VoiceResponse
 * 
 * @const app Express application with CORS support
 * @const server HTTP server created using Express
 * @const twilio Twilio library for telephony integration
 * @const VoiceResponse Twilio's VoiceResponse library for generating TwiML instructions
 * @const wss WebSocket Server
 * @const PORT Port number to listen for incoming requests, defaults to 3000
 * 
 * @route GET / - Returns the overlay HTML file for controlling the phone system.
 * @route GET /admin - Returns the admin panel HTML file for managing phone calls.
 * 
 * WebSocket Configuration:
 * @listens wss - Handles WebSocket connections between clients for real-time communication.
 * 
 * @listens ws.on('message') - Listens for messages from WebSocket clients and broadcasts them to all connected clients.
 * 
 * For more information on how to use and configure the server, please refer to the project documentation.
 */

require('dotenv').config();
const express = require('express');
const ws = require('ws');
const app = express().use(require('cors')());
const server = require('http').createServer(app);
const twilio = require('twilio');
const VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
const wss = new ws.Server({ server });
const PORT = process.env.PORT || 3000;

// Serve the overlay HTML file
app.get('/', (req, res) => {
    res.sendFile('/public/overlay.html', { root: __dirname });
})

// Serve the admin HTML file
app.get('/admin', (req, res) => {
    res.sendFile('/public/admin.html', { root: __dirname });
});

// WebSocket server setup
wss.on('connection', (ws) => {
    // Handle WebSocket message broadcasting to all connected clients
    ws.on('message', (message) => {
        wss.clients.forEach((client) => {
            client.send(message);
        })
    })
})

/**
 * Voice Request URL API for Outgoing Calls
 * 
 * This API endpoint generates TwiML instructions for handling outgoing calls from your Twilio Voice SDK application.
 * TwiML is a set of XML-like instructions that define how a call should be handled. This endpoint creates TwiML
 * for making an outgoing call to a specific phone number.
 * 
 * @route POST /
 * @method POST
 * 
 * @returns {string} A TwiML document as a response in XML format, instructing Twilio how to handle the outgoing call.
 * @throws {error} If there are issues with TwiML generation or other unexpected errors.
 * 
 * For more information on Twilio Voice SDK and outgoing calls, visit:
 * https://www.twilio.com/docs/voice/sdks#outgoing-calls-from-the-voice-sdk
 */
app.post('/', (req, res) => {
    // Create a new VoiceResponse object to generate TwiML
    const twiml = new VoiceResponse();

    // Configure the Dial verb with desired options
    const dial = twiml.dial({
        callerId: '+447480569210', // Specify the caller ID for the outgoing call
        record: true, // Enable call recording
    });

    // Specify the destination phone number to call
    dial.number('916353260512')

    // Set the response type to text/xml
    res.type('text/xml');

    // Send the generated TwiML as an XML response
    res.send(twiml.toString());
})

/**
 * Voice Token Request API
 * 
 * This API endpoint generates an access token for the Twilio Voice SDK, allowing your client-side application
 * to establish outgoing calls directly. The token is created with the necessary credentials and scopes.
 * 
 * @route POST /token
 * @method POST
 * 
 * @param {string} accountSid - Your Twilio Account SID (Account Identifier).
 * @param {string} authToken - Your Twilio Account Auth Token (used for authentication).
 * @param {string} applicationSid - Twilio Application SID (unique identifier for your Twilio Voice application).
 * 
 * @returns {object} A JSON response containing the Twilio access token.
 * @throws {error} If there are issues with token generation or missing required parameters.
 */
app.post('/token', (req, res) => {
    // Retrieve the necessary parameters from your environment or request
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const applicationSid = process.env.TWILIO_APP_SID

    // Initialize Twilio ClientCapability to create a Voice token
    const { ClientCapability } = twilio.jwt;
    const capability = new ClientCapability({
        accountSid: accountSid,
        authToken: authToken,
    });

    // Add an outgoing client scope to enable outgoing calls
    capability.addScope(new ClientCapability.OutgoingClientScope({ applicationSid: applicationSid }));

    // Generate the Twilio Voice access token
    const token = capability.toJwt();

    // Send the token as JSON response to the client
    res.json({ token: token });
});

server.listen(PORT, () => console.log(`App is listening on port ${PORT}`));