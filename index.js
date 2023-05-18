
// You MUST have a file called "token.secret" in the same directory as this file!
// This should be the secret token found in https://dashboard.ngrok.com/
// Make sure it is on a single line with no spaces!
// It will NOT be committed.

// TO START
//   1. Open a terminal and run 'npm start'
//   2. Open another terminal and run 'npm run tunnel'
//   3. Copy/paste the ngrok HTTPS url into the DialogFlow fulfillment.
//
// Your changes to this file will be hot-reloaded!

import fetch from 'node-fetch';
import fs from 'fs';
import ngrok from 'ngrok';
import morgan from 'morgan';
import express from 'express';

// Read and register with secret ngrok token.
ngrok.authtoken(fs.readFileSync("token.secret").toString().trim());

// Start express on port 53705
const app = express();
const port = 53705;

// Accept JSON bodies and begin logging.
app.use(express.json());
app.use(morgan(':date ":method :url" :status - :response-time ms'));

// "Hello World" endpoint.
// You should be able to visit this in your browser
// at localhost:53705 or via the ngrok URL.
app.get('/', (req, res) => {
  res.status(200).send(JSON.stringify({
    msg: 'Express Server Works!'
  }))
})

// Dialogflow will POST a JSON body to /.
// We use an intent map to map the incoming intent to
// its appropriate async functions below.
// You can examine the request body via `req.body`
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_request
app.post('/', (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  // A map of intent names to callback functions.
  // The "HelloWorld" is an example only -- you may delete it.
  const intentMap = {
    "NumUsers": getNumUsers,
    "NumPosts": getNumPosts,
    "GetPosts": getPosts
  }

  if (intent in intentMap) {
    // Call the appropriate callback function
    intentMap[intent](req, res);
  } else {
    // Uh oh! We don't know what to do with this intent.
    // There is likely something wrong with your code.
    // Double-check your names.
    console.error(`Could not find ${intent} in intent map!`)
    res.status(404).send(JSON.stringify({ msg: "Not found!" }));
  }
})

// Open for business!
app.listen(port, () => {
  console.log(`DialogFlow Handler listening on port ${port}. Use 'npm run tunnel' to expose this.`)
})

// Your turn!
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_response
// Use `res` to send your response; don't return!

async function getNumUsers(req, res) {
  console.log("In getNumUsers");
  let resp = await fetch('https://cs571.org/s23/hw12/api/numUsers', {
    method: "GET",
    headers: {
      'X-CS571-ID': 'bid_14a36d6cb07d9384668f'
    }
  })
  let resJSON = await resp.json()

  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            `There are ${resJSON['users']} registered users on BadgerChat!`
          ]
        }
      }
    ]
  })
}

async function getNumPosts(req, res) {
  console.log("in get num posts")
  console.log(req.body.queryResult.parameters.chatroom);
  let resp;
  let room;
  let url;
  if(req.body.queryResult.parameters.chatroom) {
    room = req.body.queryResult.parameters.chatroom
    url = `https://cs571.org/s23/hw12/api/chatroom/${room}/numMessages`
  }
  else {
    url = `https://cs571.org/s23/hw12/api/numMessages`
  }

  resp = await(fetch(url, {
    method: "GET",
    headers: {
      'X-CS571-ID': 'bid_14a36d6cb07d9384668f'
    }
  }))

  let respJSON = await resp.json(); 
  console.log(respJSON);
  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            `There are ${respJSON.messages} messages ${room === undefined ? 'BadgerChat' : room}`
          ]
        }
      }
    ]
  })
}

async function getPosts(req, res) {
  console.log("In get posts");
  console.log(req.body.queryResult.parameters);
  let num = req.body.queryResult.parameters.number
  console.log(num)
  let numPosts = (num == '' || num > 5 ) ? 5 : parseInt(num)
  console.log(numPosts);
  let room = req.body.queryResult.parameters.chatroom;
  let url = `https://cs571.org/s23/hw12/api/chatroom/${room}/messages`;
  let cards = [];
  let resp = await(fetch(url, {
    method: "GET",
    headers: {
      "X-CS571-ID": 'bid_14a36d6cb07d9384668f'
    }
  }))

  let respJSON = await resp.json();
  // console.log(respJSON);
  let messages = respJSON.messages;
  for(let i = 0; i < numPosts; i++) {
    let card = { card: {
      title: messages[i].title,
      subtitle: messages[i].content,
      buttons: [
        {
          text: "Read more",
          postback: `https://cs571.org/s23/badgerchat/chatrooms/${room}/messages/${messages[i].id}`
        }
      ]
    }
    }

    cards.push(card);
  }

  // console.log(cards);

  res.status(200).send({
    fulfillmentMessages: cards
  })
}
