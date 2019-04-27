const AWS = require("aws-sdk");
const uuid = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.reducer = async (event, context, callback) => {
    const data = JSON.parse(event.body);
    const timestamp = new Date().getTime();

    let reduceData = [];
    let emit = (emittedData) => reduceData.push(emittedData);
    eval(data.reduceFunction);
    let doReduce = () => new Promise((resolve, reject) => {
        reduce(data.data, emit);
        resolve();
    });
    await doReduce();
    let outputReduce = () => new Promise(async (resolve, reject) => {
        let promises = [];
        reduceData.forEach(async reduceItem => {

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

            promises.push(dynamoDb.put(dynamoData).promise());
        });
        await Promise.all(promises);
        resolve();
    });
    await outputReduce();
    console.log(reduceData);
    callback(null, JSON.stringify(reduceData));
}