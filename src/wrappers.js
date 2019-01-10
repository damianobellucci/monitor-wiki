var counter = 0;
var counterMaggioriCinquecento = 0;
var counterPages = 0;
const util = require('util');
const request = require('request');
var counterExport = 0;
const chalk = require('chalk');
var conteggioFirstRevision = 0;


var wrapperGetParametricRevisions = (params, params2, params3, timespan, filterCriteria) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params, function (err, data) {
            // error handling
            if (err) {
                console.error(err);
                return;
            }
            //console.log(data);
            //console.log(util.inspect(data, false, null, true /* enable colors */));
            if (data.length == 1) {
                data = data[0].pages[Object.keys(data[0].pages)[0]];
            }
            else {
                for (let index = 1; index < data.length; index++) {
                    data[0].pages[Object.keys(data[0].pages)].revisions = data[0].pages[Object.keys(data[0].pages)].revisions.concat(data[index].pages[Object.keys(data[index].pages)].revisions)
                }
                data = data[0].pages[Object.keys(data[0].pages)[0]];
            }
            if (!data.hasOwnProperty('revisions')) data.revisions = [];
            let numberOfRevisions = data.revisions.length;

            var newData = {};

            newData.pageid = data.pageid;
            newData.title = data.title;
            newData.revisions = {};

            newData.revisions.history = data.revisions;
            newData.revisions.count = data.revisions.length;
            //console.log(newData.revisions);


            if (numberOfRevisions > 500) counterMaggioriCinquecento++;

            counter += numberOfRevisions;
            counterPages += 1;
            //console.log('page: ' + params.titles, '|', ' revisions counter: ' + numberOfRevisions);


            //console.log(data);

            //////////////////RETRIEVE CATEGORIES///////////////////

            //client.getAllParametricData(params2, function (err2, data2) {
            //if (data2 !== undefined) newData.categories = data2[0].pages[Object.keys(data2[0].pages)].categories;
            //console.log(data);

            /////////////////////////////////////////////////////


            //////////////////RETRIEVE TALKS///////////////////

            /*client.getAllParametricData(params3, function (err3, data3) {
                newData.talk = {};

                if (data3 !== undefined) {
                    if (data3.length == 1) {
                        data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                    }
                    else {
                        for (let index = 1; index < data3.length; index++) {
                            data3[0].pages[Object.keys(data3[0].pages)].revisions = data3[0].pages[Object.keys(data3[0].pages)].revisions.concat(data3[index].pages[Object.keys(data3[index].pages)].revisions)
                        }
                        data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                    }
                    if (!data3.hasOwnProperty('revisions')) data3.revisions = [];
                    newData.talk.history = data3.revisions;
                    newData.talk.count = data3.revisions.length;
                }*/
            ///////////////////////////////////////////////////////


            //////////////////RETRIEVE VIEWS///////////////////

            //console.log(newData);
            //let urlRequest = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/' + params.titles + '/daily/' + timespan[0] + '/' + timespan[1];

            //request(urlRequest, { json: true }, (err, res, body) => {
            //if (err) { /*return*/ console.log(err); }
            //console.log(body.items);
            /*else newData.views = {}; /*body.items*/

            ///////////////////////////////////////////////////


            newData.misalignment = {};
            //taggo come disallineata
            if (newData.revisions.count < filterCriteria.nEdit) {
                newData.misalignment.nEdit = true;
            }
            else newData.misalignment.nEdit = false;


            frequencyTimespan = [];

            frequencyTimespan[0] = timespan[0].substr(0, 4) + '-' + timespan[0].substr(4, 2) + '-' + timespan[0].substr(6, 2) + 'T00:00:00+0000';
            frequencyTimespan[1] = timespan[1].substr(0, 4) + '-' + timespan[1].substr(4, 2) + '-' + timespan[1].substr(6, 2) + 'T00:00:00+0000';

            //da cambiare con calcolo frequenza: countRevision/(timespan)

            var myDateStart = new Date(frequencyTimespan[0]);
            var myDateEnd = new Date(frequencyTimespan[1]);


            let frequencyEdit = newData.revisions.count / ((myDateEnd.getTime() - myDateStart.getTime()) / (1000 * 60 * 60 * 24 * 365));

            if (frequencyEdit < filterCriteria.frequencyEdit) {
                newData.misalignment.frequencyEdit = true;
            }
            else newData.misalignment.frequencyEdit = false;

            let misalignmentNeditLog = newData.misalignment.nEdit;
            let misalignmentFrequencyLog = newData.misalignment.frequencyEdit;

            if (newData.misalignment.nEdit) misalignmentNeditLog = chalk.red(newData.misalignment.nEdit);
            if (newData.misalignment.frequencyEdit) misalignmentFrequencyLog = chalk.red(newData.misalignment.frequencyEdit);


            console.log('Page title: ' + chalk.green(newData.title) + ' | ' + 'misalignement n.Edit: ' + misalignmentNeditLog + ' (' + newData.revisions.count + ')' + ' | ' + 'misalignement n.Edit: ' + misalignmentFrequencyLog, '(~ ' + Math.round(frequencyEdit) + ' edit/year)');

            //console.log(newData);
            resolve(newData);
            //});

            //});


            //});

        });
    })
};

var wrapperExport = (params) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params, function (err, data) {
            //console.log(params);
            //parseObject = { title: data.title, pageid: data.pageid, revid: data.revid, nLinks: data.links.length, nExtLinks: data.externallinks.length, nSections: data.sections.length, displayTitle: data.displaytitle }
            if (err) {
                resolve([{
                    pageid: 'error'
                }]);
            }
            else {
                data[0].links = data[0].links.length;
                data[0].externallinks = data[0].externallinks.length;
                data[0].sections = data[0].sections.length;

                counterExport++;
                //console.log(counterExport);

                process.stdout.write("Downloading " + counterExport + "/" + counter + ": " + Math.round(counterExport * 100 / counter) + "%" + "\r");
                //console.log(data);
                resolve(data);
            }
        });
    })
};

var wrapperTalks = (params3, utilParams) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params3, function (err3, data3) {
            talk = {};
            if (err3) console.log(err3);

            if (data3 !== undefined) {
                if (data3.length == 1) {
                    data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                }
                else {
                    for (let index = 1; index < data3.length; index++) {
                        data3[0].pages[Object.keys(data3[0].pages)].revisions = data3[0].pages[Object.keys(data3[0].pages)].revisions.concat(data3[index].pages[Object.keys(data3[index].pages)].revisions)
                    }
                    data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                }
                if (!data3.hasOwnProperty('revisions')) data3.revisions = [];
                talk.history = data3.revisions;
                talk.count = data3.revisions.length;
                talk.pageid = utilParams;
                resolve(talk);
            }
        });
    });
};

var wrapperGetPageId = (params) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params, function (err, data) {
            if (err) { console.log(err); return; }
            else {
                resolve(data[0].pages[Object.keys(data[0].pages)[0]].pageid);
            }
        });
    });
};


var wrapperViews = (params) => {
    return new Promise((resolve, reject) => {

        let urlRequest = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/' + params.pageTitle + '/daily/' + params.start + '/' + params.end;

        request(urlRequest, { json: true }, (err, res, body) => {
            if (err) { /*return*/ /*console.log(params.pageTitle, err)*/;
                resolve({ title: params.pageTitle, pageid: params.pageid, dailyViews: [] });
            }
            else resolve({ title: params.pageTitle, pageid: params.pageid, dailyViews: body.items });
        });
    });
};

var wrapperFirstRevision = (title) => {
    return new Promise((resolve, reject) => {

        let urlRequest = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvlimit=1&rvprop=timestamp&rvdir=newer&pageids=' + title + '&format=json';
        request(urlRequest, { json: true }, (err, res, body) => {
            //console.log(title);
            if (err || body === undefined || body.query === undefined) { if (err) console.log(title, err); resolve({ error: '' }) }
            if (body === undefined || body.query === undefined) console.log(res);
            else {

                body.query.pages[Object.keys(body.query.pages)[0]].firstRevision = body.query.pages[Object.keys(body.query.pages)[0]].revisions[0].timestamp;
                delete body.query.pages[Object.keys(body.query.pages)[0]].revisions;
                conteggioFirstRevision += 1;
                //console.log(conteggioFirstRevision);
                resolve(body.query.pages[Object.keys(body.query.pages)[0]]);
            }
        });

    });
};

/*
var wrapperGetAllRevisions = (page) => {
    return new Promise((resolve, reject) => {
        client.getArticleRevisions(page, (err, res) => {
            let numberOfRevisions = res.length;

            if (numberOfRevisions > 500) counterMaggioriCinquecento++;
            counter += numberOfRevisions;
            console.log('Page: ' + page + ' Revisions counter: ' + numberOfRevisions);
            console.log('Global counter: ' + counter, 'Maggiori di 500 counter: ' + counterMaggioriCinquecento);

            resolve(numberOfRevisions);
        });
    })
};
*////
var lastCounterValue = () => {
    return counter;
};
var resetCounterValue = () => {
    counter = 0;
};

var resetCounterExport = () => {
    counterExport = 0;
};

var wrapperGetPagesByCategory = (params) => {
    return new Promise((resolve, reject) => {

        client.getAllParametricData(params, async function (err, data) {
            if (err) {
                console.error(err);
                resolve([]);
            }

            //console.log(util.inspect(data, false, null, true /* enable colors */));
            let allPages = [];

            for (let index = 0; index < data.length; index++) {
                for (el in data[index].pages) {
                    //console.log({ title: data[index].pages[el].title, pageid: data[index].pages[el].pageid });
                    allPages.push(data[index].pages[el].pageid);
                }
                //data[0].pages[Object.keys(data[0].pages)].revisions = data[0].pages[Object.keys(data[0].pages)].revisions.concat(data[index].pages[Object.keys(data[index].pages)].revisions)
            }
            //console.log(allPages);
            //data = data[0].pages[Object.keys(data[0].pages)[0]];

            resolve(allPages);
        });
    })
};

var wrapperGetParametricRevisionsTalks = (params3, paginaid) => {
    return new Promise((resolve, reject) => {
        client.getAllParametricData(params3, function (err3, data3) {
            resolve(data3);
            /*talk = {};

            if (data3 !== undefined) {
                if (data3.length == 1) {
                    data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                }
                else {
                    for (let index = 1; index < data3.length; index++) {
                        data3[0].pages[Object.keys(data3[0].pages)].revisions = data3[0].pages[Object.keys(data3[0].pages)].revisions.concat(data3[index].pages[Object.keys(data3[index].pages)].revisions)
                    }
                    data3 = data3[0].pages[Object.keys(data3[0].pages)[0]];
                }
                if (!data3.hasOwnProperty('revisions')) data3.revisions = [];
                talk.history = data3.revisions;
                talk.count = data3.revisions.length;
            }
            console.log(talk);
            resolve(talk);*/
        });
    })
};

//module.exports.wrapperGetAllRevisions = wrapperGetAllRevisions;
module.exports.wrapperGetParametricRevisions = wrapperGetParametricRevisions;
module.exports.lastCounterValue = lastCounterValue;
module.exports.wrapperGetPagesByCategory = wrapperGetPagesByCategory;
module.exports.wrapperExport = wrapperExport;
module.exports.resetCounterValue = resetCounterValue;
module.exports.resetCounterExport = resetCounterExport;
module.exports.wrapperViews = wrapperViews;
module.exports.wrapperTalks = wrapperTalks;
module.exports.wrapperGetParametricRevisionsTalks = wrapperGetParametricRevisionsTalks;
module.exports.wrapperFirstRevision = wrapperFirstRevision;
module.exports.wrapperGetPageId = wrapperGetPageId;

