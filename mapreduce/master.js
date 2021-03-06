"use strict";
require("es6-promise").polyfill();
require("isomorphic-fetch");
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda({
  region: "us-east-1"
});

const MAP_CHUNK_SIZE = 300;

async function performReduce(keyValueList, jobId, reduceFunction) {
  const key = keyValueList.length && keyValueList[0].key;
  const values = keyValueList.map(pair => pair.value);
  const reducerData = {
    jobId,
    key,
    values,
    reduceFunction
  };
  const params = {
    FunctionName: "back-end-dev-reducer",
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(reducerData)
  };
  return lambda.invoke(params).promise();
}

async function readMapReduceResults(jobId, startKey = null) {
  const params = {
    TableName: "ShuffleResults",
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

async function setStatus(jobId, status) {
  const dynamoData = {
    TableName: "Jobs",
    Key: {
      jobId
    },
    ExpressionAttributeValues: { 
      ":s": status
    },
    ExpressionAttributeNames: {'#a' : 'status'},
    UpdateExpression: "set #a = :s",
  };
  // console.log({ dynamoData });
  try {
    await dynamoDb.update(dynamoData).promise();
    console.log('Updated job status');
  } catch(e) {
    console.log('Failed to update job status: ', e);
  }
}

async function performMapReduce(record) {
  //split data set
  console.log(record.dynamodb.NewImage.jobId);
  let mapData = await (await readS3Data(
    record.dynamodb.NewImage.bucket.S,
    record.dynamodb.NewImage.fileName.S
  )).split("\n");

  console.log(`Number of lines in document ${mapData.length}`);

  let numberOfChunks = Math.ceil(mapData.length / MAP_CHUNK_SIZE);
  let mappers = [];
  for (let i = 0; i < numberOfChunks; i++) {
    const mapperData = {
      jobId: record.dynamodb.NewImage.jobId.S,
      lines: mapData.slice(i * MAP_CHUNK_SIZE, (i + 1) * MAP_CHUNK_SIZE),
      mapFunction: record.dynamodb.NewImage.map.S
    };
    const params = {
      FunctionName: "back-end-dev-mapper",
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(mapperData)
    };
    mappers.push(lambda.invoke(params).promise());
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
  let lastKeySeen = null;
  while (keepGoing) {
    for (let item of result.Items) {
      if (currentKey === null) currentKey = item.key;

      if (item.key !== currentKey) {
        reducerActions.push(
          performReduce(
            reducerKeyValues,
            jobId,
            record.dynamodb.NewImage.reduce.S
          )
        );
        reducerKeyValues = [];
        currentKey = item.key;
      }
      lastKeySeen = item.key;
      reducerKeyValues.push({ ...item });
    }
    if (result.LastEvaluatedKey) {
      result = await readMapReduceResults(jobId, result.LastEvaluatedKey);
    } else {
      keepGoing = false;
    }
  }
  if (currentKey !== lastKeySeen) {
    reducerActions.push(
      performReduce(reducerKeyValues, jobId, record.dynamodb.NewImage.reduce.S)
    );
  }
  await Promise.all(reducerActions);

  await setStatus(jobId, "done");
}

module.exports.master = async (event, context, callback) => {
  let jobs = [];
  for (let record of event.Records) {
    let mapReduceJob = new Promise(async (resolve, reject) => {
      await performMapReduce(record);
      resolve();
    });
    jobs.push(mapReduceJob);
    await Promise.all(jobs);
  }
  return;
};
