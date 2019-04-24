


module.exports.reducer = async (event, context, callback) => {
    const data = JSON.parse(event.body);

    let reduceData = [];
    let emit = (emittedData) => reduceData.push(emittedData);
    eval(data.reduceFunction);
    reduce(data.data, emit);

    console.log(reduceData);
}