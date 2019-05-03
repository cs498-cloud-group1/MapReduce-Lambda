const AWS = require("aws-sdk");
const uuid = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.reducer = async (event, context, callback) => {
  const data = event;
  const timestamp = new Date().getTime();

  let reduceData = [];
  let emit = emittedData => reduceData.push(emittedData);
  eval(data.reduceFunction);
  reduce(data.key, data.values, emit);

  for (let reduceItem of reduceData) {
    const dynamoData = {
      TableName: "jobResult",
      Item: {
        jobId: data.jobId,
        key: reduceItem.key,
        value: reduceItem.value,
        id: uuid.v1(),
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };

    await dynamoDb.put(dynamoData).promise();
  }

  callback(null, null);
};
