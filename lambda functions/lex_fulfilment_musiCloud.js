// pushes Lex message to SQS queue once the DiningSuggestionsIntent is ready for fulfillment
'use strict';
exports.handler = (event, context, callback) => {
    const sessionAttributes = event.sessionAttributes;
    const slots = event.currentIntent.slots;
    
    const location = slots.location;
    // const artist = slots.artist;
    const genre = slots.genre;
    const phone = slots.phone;
    const email = slots.email;
    
    console.log(event.currentIntent);
    
    // putting a message conatining slot values onto the SQS queue (note: SQS queue must be created before this is executed)
    // load the AWS SDK for Node.js
    var AWS = require('aws-sdk');
    // set the region 
    AWS.config.update({region: 'us-east-1'});
    
    // create an SQS service object
    var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
    
    var params = {
     MessageAttributes: {
      "genre": {
        DataType: "String",
        StringValue: genre
       },
      // "artist": {
      //   DataType: "String",
      //   StringValue: artist
      // },
      "location": {
        DataType: "String",
        StringValue: location
       },
       "phone": {
        DataType: "String",
        StringValue: phone
       },
       "email": {
        DataType: "String",
        StringValue: email
       }
     },
     MessageBody: "Details received from the customer upon intent fulfillment.",
     QueueUrl: "https://sqs.us-east-1.amazonaws.com/883279306403/customer_requests_queue"
    };
    
    sqs.sendMessage(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data.MessageId);
        console.log(data);
      }
    });
    
    // close informs the Lex intent not to expect any further responses from the user 
    let response = { sessionAttributes: event.sessionAttributes,
          dialogAction: {
              type: "Close",
              fulfillmentState: "Fulfilled",
              message: {
                  contentType: "PlainText",
                  content: `Thank You! Your request is being processed and you will receive an SMS and an Email soon!`
              }
          }
    };
    callback(null, response);
};