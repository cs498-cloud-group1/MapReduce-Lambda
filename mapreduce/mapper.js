

module.exports.mapper = async (event, context, callback) => {
    const data = JSON.parse(event.body);

    let mapData = [];
    let emit = (emittedData) => mapData.push(emittedData);
    eval(data.mapFunction);
    let doMap = () => new Promise((resolve, reject) => {
        map(data.data, emit);
        resolve();
    });
    await doMap();
    console.log(mapData);
    callback(null, JSON.stringify(mapData));
}