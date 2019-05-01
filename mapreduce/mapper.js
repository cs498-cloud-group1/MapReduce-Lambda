const AWS = require("aws-sdk");
const uuid = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.mapper = async (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = event;
  let mapData = [];
  let emit = emittedData => mapData.push(emittedData);
  eval(data.mapFunction);
  map(data.data, emit);

  let dynamoData = {
    RequestItems: {
      shuffleResults: []
    }
  };

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
          let result = await dynamoDb.batchWrite(dynamoData).promise();
          await sleep(200);
          console.log(result);
        } catch (e) {
          console.log(e);
        }
        dynamoData["RequestItems"]["shuffleResults"] = [];
      }
    }
  }

  if (dynamoData["RequestItems"]["shuffleResults"] !== []) {
    try {
      await dynamoDb.batchWrite(dynamoData).promise();
    } catch (e) {
      console.log(e);
    }
  }
  callback(null, null);
};
