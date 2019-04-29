# MapReduce-Lambda

## Setup
Setup aws creds locally

run `serverless deploy`

## to create a job
`curl -X POST https://xb6u8lsa7h.execute-api.us-east-1.amazonaws.com/dev/jobs --data '{ "jobName": "Test Job", "bucket": "mapreduce-data-bucket", "fileName": "don-quixote.txt", "map": "test", "reduce": "test" }'`

## list jobs
`curl -X GET https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/jobs`
