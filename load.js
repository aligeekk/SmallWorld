/*********************************
load Json into AWS DynamoDB
based on the follow blog post: 
https://calorious.wordpress.com/2016/03/18/episode-4-importing-json-into-dynamodb/
**********************************/

//package to read json files
var jsonfile = require('jsonfile');
//AWS node sdk
var AWS = require('aws-sdk');

//need to update region in config
AWS.config.update({
    region: "us-east-1"
});

//create a doc client to allow using JSON directly
var docClient = new AWS.DynamoDB.DocumentClient();

//prepared JSON file
//[{ ... }, { ... }]
//var fileToLoad = "test.json";
var fileToLoad = "v2smallworld.json"
var fileEntries = jsonfile.readFileSync(fileToLoad);
//utility function to create a single put request
function getEntry(index) {
    //console.log("fileEntries[index]", fileEntries[0]);
    return {
        TableName: 'friendshipv2',
        Item: fileEntries[index]
    };
}

//recursive function to save one place at a time
function savePlaces(index) {
    if (index == fileEntries.length) {
        console.log("saved all.");
        return;
    }
    var params = getEntry(index);
    //spit out what we are saving for sanity
    console.log(JSON.stringify(params));
    //use the client to execute put request.
    docClient.put(params, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            console.log("saved friendship item " + index);
            index += 1;
            //save the next place on the list
            //with half a second delay
            setTimeout(function () {
                savePlaces(index);
            }, 80);
        }
    });
}

//start saving from index - 0
savePlaces(0);