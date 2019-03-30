"use strict";

module.exports.master = (event, context, callback) => {
  event.Records.forEach(record => {
    console.log(record.dynamodb.NewImage.jobName);
  });
};
