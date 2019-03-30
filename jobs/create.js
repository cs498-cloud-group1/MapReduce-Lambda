const uuid = require('uuid');
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
    const timestamp = new Date().getTime();
    const data = JSON.parse(event.body);
    const dynamoData = {
        TableName: 'jobs',
        Item: {
          jobId: uuid.v1(),
          jobName: data.jobName,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
    };
    dynamoDb.put(dynamoData, (error) => {
        // handle potential errors
        if (error) {
          console.error(error);
          callback(null, {
            statusCode: error.statusCode || 501,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Couldn\'t create the todo item.',
          });
          return;
        }
    
        // create a response
        const response = {
          statusCode: 200,
          body: JSON.stringify(dynamoData),
        };
        callback(null, response);
    });

}