"use strict";
require("es6-promise").polyfill();
require("isomorphic-fetch");
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const supportedDatasetTypes = [".txt"];

const mapperUrl =
  "https://s4pxkot9kg.execute-api.us-east-1.amazonaws.com/dev/mapper";
const reducerUrl =
  "https://s4pxkot9kg.execute-api.us-east-1.amazonaws.com/dev/reducer";

async function performReduce(keyValueData, jobId) {
  const reducerData = {
    jobId: jobId,
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

async function readS3Data(bucket, fileName) {
  let s3Client = new AWS.S3();
  let data = await s3Client
    .getObject({ Bucket: bucket, Key: fileName })
    .promise();
  return data.Body.toString();
}

async function performMapReduce(record) {
  //split data set
  console.log(record.dynamodb.NewImage.jobId);
  let mapData = await (await (readS3Data(
    record.dynamodb.NewImage.bucket.S,
    record.dynamodb.NewImage.fileName.S
  ))).split("\n");
  let numberOfChunks = Math.ceil(mapData.length / 1000);
  let mappers = [];
  console.log(numberOfChunks);
  for (let i = 0; i < numberOfChunks; i++) {
    const mapperData = {
      jobId: record.dynamodb.NewImage.jobId.S,
      data: mapData.slice(i * 2000, (i+1) * 2000).join(' '),
      mapFunction: `
          function map(data, emit) {
              let words = data.trim().replace(/[^a-zA-Z0-9]/g, ' ').split(' ');
              words.forEach((word) => {
                if (word !== '') {
                  emit({key: word.toLowerCase(), value: 1 });
                }
              });
          }
      `
    };
    //mapper
    let mapper = fetch(mapperUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mapperData)
    });
    console.log('mapper called');
    mappers.push(mapper);
  }
  await Promise.all(mappers);
  //perform shuffleResults
  let currentKey = null;
  let reducerKeyValues = [];
  let reducerActions = [];
  let result = await readMapReduceResults(record.dynamodb.NewImage.jobId.S);
  console.log(result);
  result.Items.forEach(item => {
    if (currentKey === null) currentKey = item.key;

    if (item.key !== currentKey) {
      reducerActions.push(performReduce(reducerKeyValues));
      reducerKeyValues = [];
      currentKey = item.key;
    }
    reducerKeyValues.push({ ...item });
  });
  reducerActions.push(
    performReduce(reducerKeyValues, record.dynamodb.NewImage.jobId.S)
  );
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
