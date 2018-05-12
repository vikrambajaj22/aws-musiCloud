var AWS = require('aws-sdk');
exports.handler = (event, context, callback) => {
    console.log(event);
    AWS.config.region = 'us-east-1';
    var lexruntime = new AWS.LexRuntime();

    var params = {
        botAlias: "musicrecommender",
        botName: "MusicRecommender",
        inputText: event.message,
        userId: event.uuid,
        sessionAttributes: {}
    };
    console.log(event);
    
    // validating input parameters for MusicSuggestionsIntent
    
    lexruntime.postText(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(err, "failed");
        } else {
            console.log(data); // got something back from Amazon Lex
            context.succeed(data);
        }
    });
};