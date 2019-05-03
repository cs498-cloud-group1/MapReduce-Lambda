"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.getresults = async (event, context, callback) => {
  const params = {
    TableName: "jobResult",
    IndexName: "jobsResultsSortKey",
    KeyConditionExpression: "jobId = :job_id",
    ScanIndexForward: false,
    ExpressionAttributeValues: {
      ":job_id": event.pathParameters.jobId
    }
  };

  try {
    let result = await dynamoDb.query(params).promise();
    const error = result.$response.error;

    if (error) {
      console.error(error);
      const response = {
        statusCode: error.statusCode,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true
        },
        body: "Couldn't fetch the jobs."
      };
      callback(null, response);
      return;
    }

    if (result.Items.length == 0) {
      const response = {
        statusCode: 404,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true
        },
        body: "Couldn't found the jobs."
      };
      callback(null, response);
      return;
    }

    const resultText = result.Items.map(item => item.key + ' ' + item.value).join('\n');

    const response = {
       statusCode: 200,
       headers: {
         "Content-Type": "text/plain",
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Credentials': true,
       },
       body: resultText
    };
    callback(null, response);

  } catch (e) {
    console.error(e);
    const response = {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: "Couldn't fetch the jobs."
    };
    callback(null, response);
  }
};
