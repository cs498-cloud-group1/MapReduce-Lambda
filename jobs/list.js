"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
  TableName: "jobs"
};

module.exports.list = async (event, context, callback) => {
  try {
    let result = await dynamoDb.scan(params).promise();
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

    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(result.Items)
    };
    callback(null, response);
  } catch (e) {
    console.error(error);
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
