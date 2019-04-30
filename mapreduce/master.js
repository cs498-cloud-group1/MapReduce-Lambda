"use strict";
require("es6-promise").polyfill();
require("isomorphic-fetch");
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda({  
  region: "us-east-1"
});
const supportedDatasetTypes = [".txt"];


const reducerUrl =
  "https://xb6u8lsa7h.execute-api.us-east-1.amazonaws.com/dev/reducer";

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
                emit({key: data[0].key, value: Number(sum)});
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

async function readMapReduceResults(jobId, startKey = null) {
  const params = {
    TableName: "shuffleResults",
    IndexName: "SortKey",
    KeyConditionExpression: "jobId = :job_id",
    ExpressionAttributeValues: { ":job_id": jobId }
  };
  if (startKey) {
    params["ExclusiveStartKey"] = startKey;
  }
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
  let numberOfChunks = Math.ceil(mapData.length / 5000);
  let mappers = [];
  console.log(numberOfChunks);
  for (let i = 0; i < numberOfChunks; i++) {
    console.log(mapData.length);
    console.log(i)
    console.log(i * 5000)
    console.log(mapData.slice(i * 5000,  5000).length);
    const mapperData = {
      jobId: record.dynamodb.NewImage.jobId.S,
      data: mapData.slice(i * 5000,  (i +1) * 5000).join(' '),
      mapFunction: `
          function map(data, emit) {
              let words = data.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(' ');
              console.log(words);
              words.forEach((word) => {
                if (word !== '') {
                  emit({key: word.toLowerCase(), value: 1 });
                }
              });
          }
      `
    };
    const params  = {
      FunctionName: "back-end-dev-mapper",
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(mapperData)
    }
    mappers.push(lambda.invoke(params).promise())

  }
  console.log(`Mappers called: ${mappers.length}`);
  await Promise.all(mappers);
  //perform shuffleResults
  let keepGoing = true;
  let currentKey = null;
  let reducerKeyValues = [];
  let reducerActions = [];
  let jobId = record.dynamodb.NewImage.jobId.S;
  let result = await readMapReduceResults(jobId);
  while (keepGoing) {
    console.log(result.Count);
    for (let item of result.Items) {
      if (currentKey === null) currentKey = item.key;

      if (item.key !== currentKey) {
        reducerActions.push(performReduce(reducerKeyValues, jobId));
        reducerKeyValues = [];
        currentKey = item.key;
      }
      reducerKeyValues.push({ ...item });
    }
    if (result.LastEvaluatedKey) {
      result = await readMapReduceResults(jobId, result.LastEvaluatedKey)
    } else {
      keepGoing = false;
    }
  }

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
