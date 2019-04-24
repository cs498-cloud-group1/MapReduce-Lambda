"use strict";
require("es6-promise").polyfill();
require("isomorphic-fetch");
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const supportedDatasetTypes = [".txt"];

const mapperUrl =
  "https://orrk7q3ot4.execute-api.us-east-1.amazonaws.com/dev/mapper";
const reducerUrl =
  "https://orrk7q3ot4.execute-api.us-east-1.amazonaws.com/dev/reducer";

async function performReduce(keyValueData) {
  const reducerData = {
    data: keyValueData,
    reduceFunction: `
            function reduce(data, emit) {
                let sum = 0;
                data.forEach(datum => {
                  sum += datum.value
                });
                emit({key: data[0].key, value: sum});
            }
        `
  };
  let response2 = await fetch(reducerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reducerData)
  });
  return reducerData;
}

async function readMapReduceResults(jobId) {
  const params = {
    TableName: "shuffleResults",
    IndexName: "SortKey",
    KeyConditionExpression: "jobId = :job_id",
    ExpressionAttributeValues: { ":job_id": jobId }
  };

  let result = await dynamoDb.query(params).promise();
  return result;
}

async function performMapReduce(record) {
  const datasetUrl = record.dynamodb.NewImage.url;
  if (!datasetUrl) {
    console.log("Lambda Triggered with no dataset");
    return;
  }
  //split data set
  console.log(record.dynamodb.NewImage.jobId);
  const mapperData = {
    jobId: record.dynamodb.NewImage.jobId.S,
    data:
      "This is some test words This is some test words this is some test test test words",
    mapFunction: `
        function map(data, emit) {
            let words = data.split(' ');
            words.forEach((word) => emit({key: word.toLowerCase(), value: 1 }));
        }
    `
  };
  //mapper
  await fetch(mapperUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(mapperData)
  });
  //perform shuffleResults
  let currentKey = null;
  let reducerKeyValues = [];
  let reducerActions = [];
  let result = await readMapReduceResults(record.dynamodb.NewImage.jobId.S);
  result.Items.forEach(item => {
    if (currentKey === null) currentKey = item.key;

    if (item.key !== currentKey) {
      reducerActions.push(performReduce(reducerKeyValues));
      reducerKeyValues = [];
      currentKey = item.key;
    }
    reducerKeyValues.push({ ...item });
  });
  reducerActions.push(performReduce(reducerKeyValues));
  await Promise.all(reducerActions);
}

module.exports.master = async (event, context, callback) => {
  let jobs = [];
  event.Records.forEach(record => {
    let mapReduceJob = new Promise(async (resolve, reject) => {
      await performMapReduce(record);
      resolve();
    });
    jobs.push(mapReduceJob);
  });

  await Promise.all(jobs);
  return;
};
