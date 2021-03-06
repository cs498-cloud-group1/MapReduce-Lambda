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
  data.lines.forEach(line => map(line, emit));

  let dynamoData = {
    RequestItems: {
      ShuffleResults: []
    }
  };

  for (let mapItem of mapData) {
    if (mapItem.key && mapItem.value) {
      dynamoData["RequestItems"]["ShuffleResults"].push({
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
      if (dynamoData["RequestItems"]["ShuffleResults"].length == 25) {
        try {
          let result = await dynamoDb.batchWrite(dynamoData).promise();
          await sleep(200);
        } catch (e) {
          console.log(e);
        }
        dynamoData["RequestItems"]["ShuffleResults"] = [];
      }
    }
  }

  if (dynamoData["RequestItems"]["ShuffleResults"].length > 0) {
    try {
      await dynamoDb.batchWrite(dynamoData).promise();
    } catch (e) {
      console.log(e);
    }
  }
  callback(null, null);
};
