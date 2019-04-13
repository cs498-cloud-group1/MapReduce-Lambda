


module.exports.reducer = async (event, context, callback) => {
    const data = JSON.parse(event.body);

    console.log('reducer called');
    console.log(data);
    console.log(data.reduceFunction);
    eval(data.reduceFunction);
    reduce(data.data);
}