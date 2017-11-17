## 2016 Columbia Univeristy Social Networks Data Challenge Backend

### Goal of this data challenge:
Develop efficient path finding algorithms with minimum cost using social network properties taught in class. 

*This is the repository for teaching assistants.

###  Architecture
use AWS Lambda and AWS DynamoDB to create a serverless RESTful API (that handles queries and response of graph query). 

### important files:
 	
 load.js: load dataset(~5 million nodes)into AWS Dynamo db using Nodesdk     
 
 smallworldlambdav2.js: AWS lambda function version 2     
 
 smallworldlambdav3.js: AWS lambda function version 3, clean up error code and return sensible error message when missing uni and testcaseID   
 
 transform_dataset-v1.py: data transformation    
 
 v2smallworld.json: source file, depreciated as better to have keys in String instead of Int; also the value of key "friends" is better to be a list instead of string    
 
 v3smallworld.json:  updated source file  \"21693\" to take care of "      
  
 httpRequestDemo.ipynb: a python http request demo for students    
 
 httprequest_r.R:	R http request example   
 
 postcall: demo for API call for vscode RestClient     
 
 oct20introtoDC.pptx: short presentation of this data challenge     
 
 2016DataChallenge1.pdf: detailed instructions for students   
 
 .yaml: can be uploaded through Swagger to AWS API gateway

