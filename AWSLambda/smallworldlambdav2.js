"use strict";
/// <reference path="../typings/index.d.ts" />
var sdk = require('aws-sdk');
var testcasesKeys = ['test_id', 'start', 'target'];
var edgesKeys = ['id', 'node1', 'node2'];
var resultKeys = ['uni', 'test_id', 'path'];
var countersKeys = ['uni', 'testcaseID', 'nOfQueries', 'nOfSubmission', 'path'];
var friendshipv2Keys = ['node', 'friend'];
function getKeys(tableName) {
    if (tableName === 'testcases') {
        return testcasesKeys;
    }
    else if (tableName === 'edges') {
        return edgesKeys;
    }
    else if (tableName === 'result') {
        return resultKeys;
    }
    else if (tableName == 'counters') {
        return countersKeys;
    } else if (tableName == 'friendshipv2') {
        return friendshipv2Keys;
    }
}
var DBManager = (function () {
    function DBManager(_db) {
        this._db = _db;
    }
    DBManager.prototype.create = function (tableName, item, callback) {
        var params = {
            TableName: tableName,
            Item: item
        };
    
        this._db.put(params, callback);
        console.log("submission confirmation: you are " + item.uni + " at testcase " + item.testcaseID + " and your path is " + item.path + "number of queries is " + item.nOfQueries);
        
    };
    DBManager.prototype.read = function (tableName, payload, callback) {
        var params = {
            TableName: tableName,
            Key: payload.key
        };
        console.log("you are reading: ", payload.key, "from table, ", tableName);
        this._db.get(params, callback);
    };
    DBManager.prototype.update = function (tableName, payload, callback) {
        //console.log("I am updating!");
        var _this = this;
        /*
        this._db.get({
            TableName: tableName,
            Key: payload.key
        }, function (err, res) {
            if (!res) {
                callback(new Error("uni" + payload.key.uni + " does not exists."));
                return;
            }
            var r = res.Item;
            var attributes = {};
            getKeys(tableName).forEach(function (e) {
                if (payload.values[e] && r[e] !== payload.values[e]) {
                    attributes[e] = {
                        Action: "PUT",
                        Value: payload.values[e]
                    };
                }
            });
            var params = {
                TableName: tableName,
                Key: payload.key,
                AttributeUpdates: attributes
            };
             });*/
        console.log("in update: payload.keys", payload.key);
        var attributes = {};

        var params = {
            TableName: tableName,
            Key: payload.key
        };
        this._db.update (params, callback);
       
    };
    DBManager.prototype.delete = function (tableName, payload, callback) {
        var params = {
            TableName: tableName,
            Key: payload.key
        };
        this._db.delete(params, callback);
    };
    DBManager.prototype.find = function (tableName, payload, callback) {
        var params = {
            TableName: tableName,
            FilterExpression: payload.expression,
            ExpressionAttributeValues: payload.values
        };
        this._db.scan(params, callback);
    };
    return DBManager;
}());
var Validator = {
    'email': function (email) {
        // TODO: add comment about this regex
        var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
        return regex.test(email);
    },
    'zipcode': function (zipcode) {
        // TODO: add comment about this regex
        var regex = /^\d{5}$/;
        return regex.test(zipcode);
    }
};
function validate(data, validatorName, callback) {
    if (data && Validator[validatorName](data)) {
        return true;
    }
    callback(new Error('Value: ' + data + ' is not validated as ' + validatorName));
    return false;
}
function tryFind(payload, key) {
    if (payload.item && payload.item[key]) {
        return payload.item[key];
    }
    else if (payload.values && payload.values[key]) {
        return payload.values[key];
    }
}
function handler(event, context, callback) {
    var dynamo = new sdk.DynamoDB.DocumentClient();
    var db = new DBManager(dynamo);
    var tableName = event.tableName;
    var email = tryFind(event.payload, 'email');
    if (email && !validate(email, 'email', callback)) {
        return;
    }
    var zipcode = tryFind(event.payload, 'zipcode');
    if (zipcode && !validate(zipcode, 'zipcode', callback)) {
        return;
    }
    var alreadySubmittedError = {
        code: "submitted",
        message: "already submitted! "
    };
    var missingKeysError = {
        code : "keysNotFound",
        message: "Missing important keys 'uni' and/or 'testcaseID"
    };
    var missingPathError = {
        code : "pathNotFound",
        message: "Missing path!"
    };
    var stepExceedsLimitsError = {
        code : "limitExceeds",
        message : "Step exceeds limit!"
    };
    var uniNotAuthorized = {
        code : "uniNotAuthorized",
        message : "your uni is not authorized for this operation or the testcaseID does not exist!"
    };
    switch (event.operation) {
        case 'create':
            var item_1 = {};
            var payload_1 = event.payload.item;
            getKeys(tableName).forEach(function (e) {
                item_1[e] = payload_1[e];
            });
            db.create(tableName, item_1, callback);
            break;
        case 'readFriendship' : 
            var item2 = event.payload.item;
            console.log(item2);
            var payload2 = {};
            var payload3 = {};
            var payload4 = {};
            console.log ("item2. uni", item2.uni);
            payload2 = {
                "key" : {
                    "uni" : item2.uni,
                    "testcaseID" : item2.testcaseID
                }
            };
            db.read('counters', payload2, function (err, res) {
                //console.log("res, ", res);

                    if (res.Item === undefined) {

                        callback(JSON.stringify(uniNotAuthorized));
                    } else {
                                        
                        //console.log("I sin res");
                        var times = res.Item.nOfQueries;
                        //console.log("I see times within res", times);
                        if (times >= 5000) {
                        
                            flag = "Step exceeds limit!";
                            //context.callbackWaitsForEmptyEventLoop = false; 
                            callback(JSON.stringify(stepExceedsLimitsError));
                        
                        } else {
                            //update nOfQueries into counteres 
                            var nOfQueries = parseInt(res.Item.nOfQueries) + 1;
                            //console.log("updated n of queries: ", nOfQueries);
                            //console.log("res.Item.uni? ", res.Item.uni);
                            /*
                            payload3 = {
                                "key" : {
                                    "uni" : res.Item.uni,
                                    "testcaseID" : res.Item.testcaseID
                                },
                                "values" : {
                                    "nOfQueries" : nOfQueries
                                } 
                            };
                            db.update('counters', payload3, callback);
                            */
                            res.Item.nOfQueries = nOfQueries;
                            db.create('counters', res.Item,  function (err, res){
                                payload4 = {
                                    "key" : {
                                         "node" : item2.node
                                    }
                                };

                                db.read(tableName, payload4, callback);

                            }, callback);
                            //read from tables
                            
                            

                            //db.read(tableName, payload4, callback);
                            /*
                            db.read(tableName, payload4,  function (err, res){
                                var output1;
                                output1 = {
                                    node : item2.node,
                                 neighbors : res.Item,
              
                                }
                                callback (JSON.stringify(output1));                               

                            });*/
                            
                            

                        }
                    }
            });
           
            /*
            payload4 = {
                    "key" : {
                    "node" : item2.node
                    }
                };

            db.read(tableName, payload4, callback);
            break;   
            */
            break;
        case 'submit':
            var item1_1 = {};
            var payload1_1 = event.payload.item;
            var flag = null;
            getKeys(tableName).forEach(function (e) {
                item1_1[e] = payload1_1[e];
            });
            
            if (item1_1.uni === undefined || item1_1.uni.length === 0 || item1_1.testcaseID === undefined || item1_1.testcaseID.length === 0 ) {
                
                //context.fail("Missing important keys 'uni' and/or 'testcaseID'");
                callback(JSON.stringify(missingKeysError));
            } else if (item1_1.path === undefined) {
    
                //flag = "missing path!";
                //context.fail("Missing path~");
                callback(JSON.stringify(missingPathError));
            } 
            //check number of submission! 
            var payload1 = {};

            payload1 = {
                "key" : {
                    "uni" : item1_1.uni,
                    "testcaseID" : item1_1.testcaseID
                 }
            };

            db.read('counters', payload1, function (err, res) {
            if (res) {
                    var times = res.Item.nOfSubmission;
                    console.log("I see times within res", times);
                    if (times !== 0) {
                        
                        flag = "already submitted!";
                        //context.callbackWaitsForEmptyEventLoop = false; 
                        callback(JSON.stringify(alreadySubmittedError));
                        
                    } else {
                            //create this submisison into counteres 
                            res.Item.nOfSubmission = 1;
                            res.Item.path = item1_1.path;
                            db.create(tableName, res.Item, callback);
                            var output;
                            output = {
                                code : "submisionAccepted",
                                uni : res.Item.uni,
                                testcaseID : res.Item.testcaseID,
                                path : res.Item.path
                            }
                            callback (JSON.stringify(output));
                            /*
                            console.log("flag?? ", flag);
                            if (flag === "already submitted!") {
                                console.log("yes, it is submitted! ")
                                //context.fail("You have already submitted");
                                callback(JSON.stringify(alreadySubmittedError));
                            }*/
                            

                            }
                    }
            });
            //console.log("flag? ", flag); //undefined again...how can I make the "already submitted" show up? 
           break;
            
            
        case 'read':
            db.read(tableName, event.payload, callback);
            break;
        case 'update':
            db.update(tableName, event.payload, callback);
            break;
        case 'delete':
            db.delete(tableName, event.payload, callback);
            break;
        case 'find':
            db.find(tableName, event.payload, callback);
            break;
        case 'getaddr':
            db.read('customers', event.payload, function (err, res) {
                if (res) {
                    var id = res.Item.address_ref;
                    db.read('addresses', {
                        "key": {
                            "uuid": id
                        }
                    }, callback);
                }
            });
            break;

    }
}
exports.handler = handler;
