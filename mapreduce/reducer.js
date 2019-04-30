const AWS = require("aws-sdk");
const uuid = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.reducer = async (event, context, callback) => {
  const data = JSON.parse(event.body);
  const timestamp = new Date().getTime();

  let reduceData = [];
  let emit = emittedData => reduceData.push(emittedData);
  eval(data.reduceFunction);
  let doReduce = () =>
    new Promise((resolve, reject) => {
      reduce(data.data, emit);
      resolve();
    });
  await doReduce();

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

    let result = await dynamoDb.put(dynamoData).promise();
    console.log(result);
  }

  console.log(reduceData);
  callback(null, JSON.stringify(reduceData));
};
