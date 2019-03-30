"use strict";

const uuid = require("uuid");
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = async (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  const dynamoData = {
    TableName: "jobs",
    Item: {
      jobId: uuid.v1(),
      jobName: data.jobName,
      url: data.url,
      map: data.map,
      reduce: data.reduce,
      status: "created",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
  try {
    let result = await dynamoDb.put(dynamoData).promise();
    const error = result.$response.error;

    if (error) {
      // TODO: This is repeated elsewhere maybe abstract this out into a helper
      // function??
      console.error(error);
      const response = {
        statusCode: error.statusCode,
        headers: { "Content-Type": "text/plain" },
        body: "Couldn't fetch the jobs."
      };
      callback(null, response);
      return;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(dynamoData.Item)
    };
    callback(null, response);
  } catch (e) {
    // TODO: This is repeated in other functions
    // abstract out and handle else where??
    console.error(e);
    const response = {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Unknown error occurred"
    };
    callback(null, response);
  }
};
