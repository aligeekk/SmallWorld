/*
v3: reutrn missingKeysError when students don't enter their uni or testcaseID, which is essential for tracking query times
to test querying for node neighbors?
{
  "operation": "readFriendship",
  "tableName": "friendshipv3",
  "payload": {
    "item": {
      "uni" : "yh2901",
      "node": "1",
      "testcaseID": "1"
    }
  }
}
to test submission?
{
  "operation": "submit",
  "tableName": "counters",
  "payload": {
    "item": {
      "uni" : "yh2901",
      "path": "1",
      "testcaseID" : "1"
    }
  }
}
*/

"use strict";
/// <reference path="../typings/index.d.ts" />
var sdk = require('aws-sdk');
//var neo4j = require("neo4j");
//var db = new neo4j.GraphDatabase("http://contentcatalog:mL1CSF2PKYTtPkGMdRnv@hobby-hhimaappojekgbkebdhlnhol.dbs.graphenedb.com:24789");
var testcasesKeys = ['test_id', 'start', 'target'];
var edgesKeys = ['id', 'node1', 'node2'];
var resultKeys = ['uni', 'test_id', 'path'];
var countersKeys = ['uni', 'testcaseID', 'nOfQueries', 'nOfSubmission', 'path'];
var friendshipv2Keys = ['node', 'friend'];
var friendshipv3Keys = ['node', 'friend'];
var testcaseList = ['1'];

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
    else if (tableName === 'counters') {
        return countersKeys;
    }
    else if (tableName === 'friendshipv2') {
        return friendshipv2Keys;
    }
    else if (tableName === 'friendshipv3') {
        return friendshipv3Keys;
    }
}
function isInList(listname, element) {
    if (listname === 'testcaseList') {
        var index = testcaseList.indexOf(element);
        if (index === -1) {
            return false;
        } else {
            return true;
        }
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
        //console.log("you are reading: ", payload.key, "from table, ", tableName);
        this._db.get(params, callback);
    };
    DBManager.prototype.update = function (tableName, payload, callback) {
        var _this = this;
        var params = {
            TableName: tableName,
            Key: payload.key
        };
        this._db.update(params, callback);

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
} ());

function tryFind(payload, key) {
    if (payload.item && payload.item[key]) {
        return payload.item[key];
    }
    else if (payload.values && payload.values[key]) {
        return payload.values[key];
    } else if (payload.key && payload.key[key]) {
        return payload.key[key];
    }
    return false;
}
/*
** validate path validity by calling neo4j through RESTful API
*/
function pathValidation(source, target, callback, db) {
    var httpRequestError = {
        code: "500",
        message: "Can't connect neo4j"

    };
    var internalServerError = {
        code: "500",
        message: "neo4j can't connect"

    };
    var invalidPathError = {
        message: "not valid"
    };
    var unrecognizableError = {
        message: "this path can't be parsed"
    };
    /*calling neo4j */
    var sourcenode = source;
    var targetnode = target;
    //var http = require("http");
    var request = require('request');
    //var querydata = "MATCH (source) - [f:FRIEND] -> (target)\nWHERE source.name =" + sourcenode + "and target.name =" + targetnode + "\nRETURN f IS NOT NULL as isFriend";  

    console.log("I am in validation path");
    //Let’s define a function which fires the cypher query.
    var httpUrlForTransaction = "http://contentcatalog:mL1CSF2PKYTtPkGMdRnv@hobby-hhimaappojekgbkebdhlnhol.dbs.graphenedb.com:24789/db/data/transaction/commit";
    function runCypherQuery(query, params, callback) {
        request.post({
            uri: httpUrlForTransaction,
            json: { statements: [{ statement: query, parameters: params }] }
        },
            function (err, res, body) {
                callback(err, body);
            })
    }

    /**
     * Let’s fire some queries as shown below.
     * */
    runCypherQuery(
       "MATCH (source) - [f:FRIEND] -> (target)\nWHERE source.name = {source} and target.name = {target}\nRETURN f IS NOT NULL as isFriend ", {
            source: 1,
            target: 2,
        }, function (err, resp) {
            if (err) {
                console.log(err);
            } else {
                var string = JSON.stringify(resp);
                console.log("string: ", string);
                console.log("resp.results.data ", resp.results.data);
                console.log("resp.results.columns ", resp.results.columns);
                console.log("resp.results", resp.results);
                console.log("resp ", resp);

            }
        }
    );
}


function handler(event, context, callback) {
    var dynamo = new sdk.DynamoDB.DocumentClient();
    var db = new DBManager(dynamo);
    var tableName = event.tableName;
    var alreadySubmittedError = {
        code: "422",
        message: "already submitted! "
    };
    var missingKeysError = {
        code: "400",
        message: "Missing 'uni' and/or 'testcaseID"
    };
    var missingNode = {
        code: "400",
        message: "Give me the node please"
    };
    var missingPathError = {
        code: "400",
        message: "give me your path please"
    };
    var stepExceedsLimitsError = {
        code: "422",
        message: "Step exceeds limit!"
    };
    var uniNotAuthorized = {
        code: "404",
        message: "your uni is not authorized for this operation or the testcaseID does not exist!"
    };
    var notValidTestcaseError = {
        code: "404",
        message: "this testcaseID does not exist"
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
        case 'readFriendship':
            var testcaseID = tryFind(event.payload, "testcaseID");
            var item2 = event.payload.item;
            console.log(item2);
            var payload2 = {};
            var payload3 = {};
            var payload4 = {};
            if (!tryFind(event.payload, "uni")) {
                callback(JSON.stringify(missingKeysError));
            } else if (!tryFind(event.payload, "testcaseID")) {
                callback(JSON.stringify(missingKeysError));
            } else if (!tryFind(event.payload, "node")) {
                callback(JSON.stringify(missingNode));
            } else if (!isInList("testcaseList", testcaseID)) {
                callback(JSON.stringify(notValidTestcaseError));
            } else {
                payload2 = {
                    "key": {
                        "uni": item2.uni,
                        "testcaseID": item2.testcaseID
                    }
                };
                db.read('counters', payload2, function (err, res) {
                    if (res.Item === undefined) {
                        callback(JSON.stringify(uniNotAuthorized));
                    } else {
                        var times = res.Item.nOfQueries;
                        if (times >= 5000) {
                            flag = "Step exceeds limit!";
                            callback(JSON.stringify(stepExceedsLimitsError));
                        } else {
                            //update nOfQueries into counteres 
                            var nOfQueries = parseInt(res.Item.nOfQueries) + 1;
                            res.Item.nOfQueries = nOfQueries;
                            db.create('counters', res.Item, function (err, res) {
                                payload4 = {
                                    "key": {
                                        "node": item2.node
                                    }
                                };
                                db.read(tableName, payload4, callback);
                            }, callback);
                        }
                    }
                });
            }
            break;
        case 'submit':
            var testcaseID = tryFind(event.payload, "testcaseID");
            if (!tryFind(event.payload, "uni")) {
                console.log("no uni");
                callback(JSON.stringify(missingKeysError));
            } else if (!tryFind(event.payload, "testcaseID")) {
                console.log("no testcase");
                callback(JSON.stringify(missingKeysError));
            } else if (!tryFind(event.payload, "path")) {
                callback(JSON.stringify(missingPathError));
            } else if (!isInList("testcaseList", testcaseID)) {
                callback(JSON.stringify(notValidTestcaseError));
            } else {
                //call neo4j to validate the path! 
                var path = tryFind(event.payload, "path");
                console.log("path is ", path);
                var pathlist = path.split(",");
                console.log("pathlist ", pathlist);
                var length = pathlist.length;
                for (var i = 0; i < length - 1; i++) {
                    console.log(pathlist[i], pathlist[i + 1])
                    pathValidation(pathlist[i], pathlist[i + 1], callback, db)
                };
                var item1_1 = {};
                var payload1_1 = event.payload.item;
                var flag = null;
                getKeys(tableName).forEach(function (e) {
                    item1_1[e] = payload1_1[e];
                });
                //check number of submission! 
                var payload1 = {};

                payload1 = {
                    "key": {
                        "uni": item1_1.uni,
                        "testcaseID": item1_1.testcaseID
                    }
                };

                db.read('counters', payload1, function (err, res) {
                    if (res) {
                        var times = res.Item.nOfSubmission;
                        console.log("I see times within res", times);
                        if (times === 1) {
                            flag = "already submitted!";
                            callback(JSON.stringify(alreadySubmittedError));

                        } else {
                            //create this submisison into counteres 
                            console.log("not submitted yet!");
                            res.Item.nOfSubmission = 1;
                            res.Item.path = item1_1.path;
                            db.create(tableName, res.Item, callback);

                            var output;
                            output = {
                                code: "submisionAccepted",
                                uni: res.Item.uni,
                                testcaseID: res.Item.testcaseID,
                                path: res.Item.path
                            };
                            callback(JSON.stringify(output));

                        }
                    }
                });
            }
            break;
        case 'read':
            var testcaseID = tryFind(event.payload, "testcaseID");
            if (!isInList("testcaseList", testcaseID)) {
                callback(JSON.stringify(notValidTestcaseError));
            } else {
                db.read(tableName, event.payload, callback);
            }
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
