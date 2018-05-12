'use strict';
exports.handler = (event, context, callback) => {
    console.log('LogScheduledEvent');
    console.log('Received event:', JSON.stringify(event, null, 2));
    // load the AWS SDK for Node.js
    var AWS = require('aws-sdk');
    // set the region 
    AWS.config.update({region: 'us-east-1'});
    
    // create an SQS service object
    var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
    
    var queueURL = "https://sqs.us-east-1.amazonaws.com/883279306403/customer_requests_queue";
    
    var params = {
        QueueUrl: queueURL,
        MessageAttributeNames: [
            "All"  // retrieves all the attributes
            ]
    };
    
    var genre = "";
    //var artist = "";
    var location = "";
    var phone = "";
    var email = "";
    
    sqs.receiveMessage(params, function(err, data) {
      if (err) {
        console.log("Error receiving message from SQS", err);
       } 
       else {
           console.log("Data:", data);
           if (data.hasOwnProperty("Messages")){
               const message = data.Messages[0];
               console.log(message);
               const receipt_handle = message.ReceiptHandle;  // needed for deleting the message from the queue once processed
               
               genre = message.MessageAttributes.genre.StringValue;
               //artist = message.MessageAttributes.artist.StringValue;
               location = message.MessageAttributes.location.StringValue;
               phone = message.MessageAttributes.phone.StringValue;
               email = message.MessageAttributes.email.StringValue;
               
               // converting phone number to format needed by SNS i.e. must begin with +1
               phone = phone.replace(/\D+/g, "");
               phone = phone.substr(phone.length-10);
               phone = "+1"+phone;
               
              // query elasticsearch based on genre
              var elasticsearch=require('elasticsearch');
              genre = genre.toLowerCase();
              var songs_list = [];
              console.log(genre);
              var client = new elasticsearch.Client({hosts: ['search-music-elastic-prediction-jmrxfeaxcg45sghrpivuxdbipu.us-east-1.es.amazonaws.com']});
              client.search({
                  index: genre,
                  body: {
                      "size": 10,
                      "query": { "match_all": {} },
                      "_source": "song",
                      "sort": { "score": { "order": "desc" } }  // sort in descending order of score to get top 10 recommended songs
                  }
              }).then(function(resp) {
                  console.log(resp);
                  resp.hits.hits.forEach(function(hit){
                      songs_list.push(hit._source.song);
                      console.log(hit);
                      });
                      console.log(songs_list);
                      // query dynamodb with business_ids
                        const AWS = require('aws-sdk');
                        const docClient = new AWS.DynamoDB.DocumentClient({region: "us-east-1"});
                        
                        var sms_string1 = "Hello! Here are our suggestions for " + genre + " songs:\n";
                        var count = 0;
                        var artists_list = [];
                        var counter = 1;
                        var count3 = 1;
                        for (var i=0; i<songs_list.length; i++){
                            var song = songs_list[i];
                            console.log(song);
                            var params = {
                              TableName: "musicloud-project-table",
                              FilterExpression: "#song = :song",
                              ExpressionAttributeNames: {
                                  "#song": "song"
                              },
                              ExpressionAttributeValues: {
                                  ":song": song
                              }
                          };
                          docClient.scan(params, function(err, data) {
                          if (err) {
                              console.log(err);
                              } else {
                                  console.log(data);
                                  // data.Items will be empty if a matching song was not found in DynamoDB
                                  console.log(data.Items.length);
                                  if (data.Items.length!=0){
                                      var song_name = data.Items[0].song;
                                      var artist_name = data.Items[0].artist;
                                       
                                      artists_list.push(artist_name);
                                      count = count + 1;
                                      sms_string1 = sms_string1 + count.toString() + ". Song: " + song_name + "\nArtist: " + artist_name + "\n\n";
                                  }
                                  }
                          });
                        }
                        
                        var sms_string2 = "";
                        var sms_string3 = "";
                        //var unique_artists_list = Array.from(new Set(artists_list));
                        var unique_artists_list = [];
                        
                        setTimeout(function () {
                            // get unique artists
                            for(let i = 0;i < artists_list.length; i++){
                            if(unique_artists_list.indexOf(artists_list[i]) == -1){
                                unique_artists_list.push(artists_list[i]);
                                }
                                }
                            console.log('unique artists obtained: ', unique_artists_list);
        
                            const Songkick = require('songkick-api-node');
                            const songkickApi = new Songkick('4hzotkuZQSbNbdbB');
                        
                           //console.log("before outer loop! ");
                            for (var j = 0; j < unique_artists_list.length; j++ ) {
                                const searchRequest = {
                                    artist_name: unique_artists_list[j]
                                    //artist_name: "ed sheeran"
                                };
                            
                                var resultsList=[];
                                //console.log("before inner loop");
                                songkickApi.searchEvents(searchRequest).then(response => {
                                    console.log("Response", response);
                                    // store first response i.e. response[0] for each artist in sms_string3
                                    sms_string3 = sms_string3 + count3.toString() + ". Event: " + response[0].displayName + "\nCheck out the Link: " + response[0].uri + "\n\n";
                                    count3 = count3 + 1;
                                    for(var k = 0; k< 50; k++){  // retrieve 50 results and check which of them have a matching location
                                        //console.log("inner loop start");
                                        var Result = response[k];
                                        var string = response[k].location.city;
                                        string = string.toLowerCase();
                                        var substring = location;
                                        if(string.includes(substring))
                                        {
                                            resultsList.push(response[k]);
                                            console.log(Result);
                                            sms_string2 = sms_string2 + counter.toString() + ". Event: " + response[k].displayName + "\nCheck out the Link: " + response[k].uri + "\n\n";
                                            counter = counter + 1;
                                            break;  // retrieveing only the first location match for each artist
                                        }
                                       // console.log("inner loop end");
                                    }
                                }); 
                                console.log("SMS String 2", sms_string2);
                        }
                        //console.log("outer loop end");
                        }, 5000);
                    
                        var sms_string = "" ; 
                    
                        setTimeout(function () {
                            if (sms_string2 == "" && sms_string3=="") {
                                sms_string2 = "Sorry! No events happening around the location you mentioned :(\n";
                                sms_string = sms_string1 + sms_string2;
                            }
                            else if(sms_string2 == "" && sms_string3 != ""){
                                sms_string2 = "Sorry! No events happening around the location you mentioned :(\n";
                                sms_string3 ="However, we found the following upcoming events in other locations: \n" + sms_string3;
                                sms_string = sms_string1 + sms_string2 + sms_string3 + "Enjoy!";
                            }
                            else {
                                sms_string = sms_string1 + "Here are some suggested events:\n" + sms_string2 + "Enjoy!";
                            }
                            console.log("SMS String: ", sms_string);
                            // console.log(artists_list);
                            // send SMS to user using SNS
                            let params = {
                                Message: sms_string,
                                PhoneNumber: phone
                                };
                                
                            var sns = new AWS.SNS({apiVersion: '2010-03-31'});
                            sns.publish(params, (err, result) => {
                                if (err) {
                                    console.log("SMS Error", err);
                                    } else {
                                        console.log('SMS Sent!');
                                        console.log(result);
                                        console.log(email);
                                        // send email
                                        var ses = new AWS.SES({region: 'us-east-1'});
                                        var eParams = {
                                            Destination: {
                                                ToAddresses: [email]
                                            },
                                            Message: {
                                                Body: {
                                                    Text: {
                                                        Data: sms_string
                                                    }
                                                },
                                                Subject: {
                                                    Data: "MusiCloud Recommendations"
                                                }
                                            },
                                            Source: "vikrambajaj@nyu.edu"
                                        };
                                        
                                        ses.sendEmail(eParams, function(err, data){
                                            if(err) console.log(err);
                                            else {
                                                console.log("EMAIL SENT");
                                                console.log(data);
                                                context.succeed(event);
                                            }
                                        });
                                        
                                        // delete message from SQS queue
                                        var deleteParams = {
                                            QueueUrl: queueURL,
                                            ReceiptHandle: data.Messages[0].ReceiptHandle
                                            };
                                        sqs.deleteMessage(deleteParams, function(err, data) {
                                            if (err) {
                                                console.log("Delete Error", err);
                                                } else {
                                                    console.log("Message Deleted from Queue", data);
                                                    }
                                        });
                                     }
                            });
                        }, 45000);
                        //callback(null, sms_string);
                       }, function(err) {
                           console.log(err.message);
                          });
                       }
                   }
    });       
};