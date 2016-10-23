/*********************************
Simple Demo for loading files into
DynamoDB.
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
//var placeFile = "test.json";
var placeFile = "v2smallworld.json"
var placeArray = jsonfile.readFileSync(placeFile);
//console.log(placeArray);
//utility function to create a single put request
function getPlace(index){
    //console.log("placeArray[index]", placeArray[0]);
    return {
        TableName: 'friendshipv2',
        Item: placeArray[index]
    };
}
 
//recursive function to save one place at a time
function savePlaces(index){
    if(index == placeArray.length){
        console.log("saved all.");
        return;
    }
 
    var params = getPlace(index);
    console.log("params: ", params)
    //spit out what we are saving for sanity
    console.log(JSON.stringify(params));
    //use the client to execute put request.
    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err);
        }else{
            console.log("saved friendship item " + index);
            index += 1;
            //save the next place on the list
            //with half a second delay
            setTimeout(function(){
                savePlaces(index);
            }, 80);
        }
    });
}
 
//start saving from index - 0
savePlaces(0);