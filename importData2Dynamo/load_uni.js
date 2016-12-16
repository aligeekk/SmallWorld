/*********************************
Simple Demo for loading files into
DynamoDB.
**********************************/
 
var jsonfile = require('jsonfile');
var AWS = require('aws-sdk');
AWS.config.update({
    region: "us-east-1"
});
var docClient = new AWS.DynamoDB.DocumentClient();
var placeFile = "uni_test.json"
var placeArray = jsonfile.readFileSync(placeFile);
function getPlace(index){
    return {
        TableName: 'countersv1',
        Item: placeArray[index]
    };
}
function savePlaces(index){
    if(index == placeArray.length){
        console.log("saved all.");
        return;
    }
 
    var params = getPlace(index);
    console.log("params: ", params)
    console.log(JSON.stringify(params));
    docClient.put(params, function(err, data) {
        if (err) {
            console.log(err);
        }else{
            console.log("saved friendship item " + index);
            index += 1;
            setTimeout(function(){
                savePlaces(index);
            }, 80);
        }
    });
}
savePlaces(0);
