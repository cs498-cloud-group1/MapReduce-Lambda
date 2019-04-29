const AWS = require("aws-sdk");
const uuid = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.mapper = async (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = event;
  let mapData = [];
  let emit = emittedData => mapData.push(emittedData);
  eval(data.mapFunction);
  let doMap = () =>
    new Promise((resolve, reject) => {
      map(data.data, emit);
      resolve();
    });
  await doMap();

  let dynamoData = {
    RequestItems: {
      shuffleResults: []
    }
  };
  let outputMap = () =>
    new Promise(async (resolve, reject) => {
      for (let mapItem of mapData) {
        if (mapItem.key && mapItem.value) {
          dynamoData["RequestItems"]["shuffleResults"].push({
            PutRequest: {
              Item: {
                jobId: data.jobId,
                key: mapItem.key,
                value: mapItem.value,
                id: uuid.v1(),
                createdAt: timestamp,
                updatedAt: timestamp
              }
            }
          });
          if (dynamoData["RequestItems"]["shuffleResults"].length == 25) {
            try {
              await dynamoDb.batchWrite(dynamoData).promise();
            } catch (e) {
              console.log(e);
            }
            dynamoData["RequestItems"]["shuffleResults"] = [];
          }
        }
      }
      resolve();
    });
  await outputMap();

  if (dynamoData["RequestItems"]["shuffleResults"] !== []) {
    try {
      console.log("Why am i here");
      await dynamoDb.batchWrite(dynamoData).promise();
    } catch (e) {
      console.log("here2");
      console.log(dynamoData["RequestItems"]["shuffleResults"].length);
      console.log(e);
    }
  }
  callback(null, JSON.stringify(mapData));
};
